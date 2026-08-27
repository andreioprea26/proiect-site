begin;

-- Stripe Checkout is configured for 30 minutes. The database hold starts at
-- 35 minutes and is aligned again to the actual Session expiry when attached.
create or replace function public.stock_reservation_ttl()
returns interval
language sql
immutable
set search_path = ''
as $$
  select interval '35 minutes';
$$;

create function public.stripe_reservation_expiry_margin()
returns interval
language sql
immutable
set search_path = ''
as $$
  select interval '5 minutes';
$$;

revoke all on function public.stripe_reservation_expiry_margin()
from public, anon, authenticated;
grant execute on function public.stripe_reservation_expiry_margin()
to service_role;

-- Preparing a card order mutates orders, payments and availability. From 6B
-- onward it is a server-only operation, while quote_checkout remains public.
revoke all on function public.prepare_card_order(uuid, jsonb, jsonb)
from anon, authenticated;
grant execute on function public.prepare_card_order(uuid, jsonb, jsonb)
to service_role;

create function public.prepare_card_order_server(
  p_idempotency_key uuid,
  p_lines jsonb,
  p_checkout jsonb,
  p_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous_sub text := current_setting('request.jwt.claim.sub', true);
  v_result jsonb;
begin
  if p_user_id is not null
    and not exists (select 1 from auth.users u where u.id = p_user_id)
  then
    return jsonb_build_object('success', false, 'code', 'invalid_user');
  end if;

  perform set_config(
    'request.jwt.claim.sub',
    coalesce(p_user_id::text, ''),
    true
  );
  v_result := public.prepare_card_order(
    p_idempotency_key,
    p_lines,
    p_checkout
  );
  perform set_config(
    'request.jwt.claim.sub',
    coalesce(v_previous_sub, ''),
    true
  );
  return v_result;
exception when others then
  perform set_config(
    'request.jwt.claim.sub',
    coalesce(v_previous_sub, ''),
    true
  );
  raise;
end;
$$;

revoke all on function public.prepare_card_order_server(
  uuid, jsonb, jsonb, uuid
) from public, anon, authenticated;
grant execute on function public.prepare_card_order_server(
  uuid, jsonb, jsonb, uuid
) to service_role;

create table public.stripe_webhook_events (
  event_id text primary key
    constraint stripe_webhook_events_id_valid
    check (
      event_id = btrim(event_id)
      and event_id ~ '^evt_[A-Za-z0-9_]+$'
      and length(event_id) <= 255
    ),
  event_type text not null
    constraint stripe_webhook_events_type_valid
    check (
      event_type in ('checkout.session.completed', 'checkout.session.expired')
    ),
  provider_checkout_session_id text not null
    constraint stripe_webhook_events_session_valid
    check (
      provider_checkout_session_id = btrim(provider_checkout_session_id)
      and provider_checkout_session_id ~ '^cs_test_[A-Za-z0-9_]+$'
      and length(provider_checkout_session_id) <= 255
    ),
  payment_id uuid not null references public.payments (id) on delete restrict,
  order_id uuid not null references public.orders (id) on delete restrict,
  result jsonb not null default '{}'::jsonb
    constraint stripe_webhook_events_result_object
    check (jsonb_typeof(result) = 'object'),
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index stripe_webhook_events_payment_idx
  on public.stripe_webhook_events (payment_id, processed_at desc);

alter table public.stripe_webhook_events enable row level security;
revoke all on table public.stripe_webhook_events from anon, authenticated;
grant select on table public.stripe_webhook_events to authenticated;

create policy stripe_webhook_events_admin_select
on public.stripe_webhook_events
for select
to authenticated
using ((select public.is_admin()));

create function public.attach_stripe_checkout_session(
  p_payment_id uuid,
  p_session_id text,
  p_session_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
  v_internal_expires_at timestamptz;
begin
  if p_payment_id is null
    or p_session_id is null
    or p_session_id <> btrim(p_session_id)
    or p_session_id !~ '^cs_test_[A-Za-z0-9_]+$'
    or length(p_session_id) > 255
    or p_session_expires_at is null
    or p_session_expires_at <= statement_timestamp()
  then
    return jsonb_build_object('success', false, 'code', 'invalid_session');
  end if;

  select p.order_id into v_payment.order_id
  from public.payments p
  where p.id = p_payment_id;
  if not found then
    return jsonb_build_object('success', false, 'code', 'payment_not_found');
  end if;

  select o.* into v_order
  from public.orders o
  where o.id = v_payment.order_id
  for update;

  select p.* into v_payment
  from public.payments p
  where p.id = p_payment_id and p.order_id = v_order.id
  for update;

  if v_payment.provider_checkout_session_id is not null then
    if v_payment.provider_checkout_session_id <> p_session_id then
      return jsonb_build_object('success', false, 'code', 'session_conflict');
    end if;
    return jsonb_build_object(
      'success', true,
      'idempotentReplay', true,
      'orderId', v_order.id,
      'paymentId', v_payment.id,
      'reservationExpiresAt', v_payment.pending_expires_at
    );
  end if;

  if v_payment.status <> 'pending'
    or v_order.status <> 'awaiting_payment'
    or v_order.payment_method <> 'card'
  then
    return jsonb_build_object('success', false, 'code', 'payment_not_attachable');
  end if;

  perform sr.id
  from public.stock_reservations sr
  where sr.order_id = v_order.id
  order by sr.inventory_id
  for update;

  if not exists (
    select 1 from public.stock_reservations sr
    where sr.order_id = v_order.id
      and sr.status = 'active'
      and sr.expires_at > statement_timestamp()
  ) then
    return jsonb_build_object('success', false, 'code', 'reservation_not_active');
  end if;

  v_internal_expires_at := p_session_expires_at
    + public.stripe_reservation_expiry_margin();

  update public.payments
  set provider = 'stripe',
      provider_checkout_session_id = p_session_id,
      pending_expires_at = greatest(pending_expires_at, v_internal_expires_at),
      metadata = metadata || jsonb_build_object(
        'stripeSessionExpiresAt', p_session_expires_at
      )
  where id = v_payment.id;

  update public.stock_reservations
  set expires_at = greatest(expires_at, v_internal_expires_at),
      metadata = metadata || jsonb_build_object(
        'stripeSessionId', p_session_id,
        'stripeSessionExpiresAt', p_session_expires_at
      )
  where order_id = v_order.id and status = 'active';

  return jsonb_build_object(
    'success', true,
    'idempotentReplay', false,
    'orderId', v_order.id,
    'paymentId', v_payment.id,
    'reservationExpiresAt', greatest(
      v_payment.pending_expires_at,
      v_internal_expires_at
    )
  );
end;
$$;

revoke all on function public.attach_stripe_checkout_session(uuid, text, timestamptz)
from public, anon, authenticated;
grant execute on function public.attach_stripe_checkout_session(uuid, text, timestamptz)
to service_role;

create function public.process_stripe_checkout_event(
  p_event_id text,
  p_event_type text,
  p_session_id text,
  p_payment_intent_id text,
  p_payment_id uuid,
  p_order_id uuid,
  p_amount_total bigint,
  p_currency text,
  p_payment_status text,
  p_mode text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
  v_confirmation jsonb;
  v_result jsonb;
  v_changed integer := 0;
begin
  if p_event_id is null
    or p_event_id !~ '^evt_[A-Za-z0-9_]+$'
    or length(p_event_id) > 255
    or p_event_type not in (
      'checkout.session.completed',
      'checkout.session.expired'
    )
    or p_session_id is null
    or p_session_id !~ '^cs_test_[A-Za-z0-9_]+$'
    or length(p_session_id) > 255
    or p_payment_id is null
    or p_order_id is null
  then
    return jsonb_build_object('success', false, 'code', 'invalid_event');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_event_id, 2));

  select jsonb_build_object(
    'success', true,
    'idempotentReplay', true,
    'eventId', swe.event_id,
    'result', swe.result
  ) into v_result
  from public.stripe_webhook_events swe
  where swe.event_id = p_event_id;
  if found then
    return v_result;
  end if;

  select p.order_id into v_payment.order_id
  from public.payments p
  where p.provider = 'stripe'
    and p.provider_checkout_session_id = p_session_id;
  if not found then
    return jsonb_build_object('success', false, 'code', 'session_not_found');
  end if;

  select o.* into v_order
  from public.orders o
  where o.id = v_payment.order_id
  for update;

  select p.* into v_payment
  from public.payments p
  where p.order_id = v_order.id
    and p.provider = 'stripe'
    and p.provider_checkout_session_id = p_session_id
  for update;

  if v_payment.id <> p_payment_id
    or v_order.id <> p_order_id
    or v_payment.order_id <> v_order.id
    or v_order.payment_method <> 'card'
    or p_mode <> 'payment'
    or p_amount_total is distinct from v_payment.amount_minor
    or upper(coalesce(p_currency, '')) <> v_payment.currency
  then
    return jsonb_build_object('success', false, 'code', 'reconciliation_failed');
  end if;

  if p_event_type = 'checkout.session.completed' then
    if p_payment_status <> 'paid' then
      return jsonb_build_object('success', false, 'code', 'payment_not_paid');
    end if;

    if p_payment_intent_id is not null and (
      p_payment_intent_id <> btrim(p_payment_intent_id)
      or p_payment_intent_id = ''
      or length(p_payment_intent_id) > 255
    ) then
      return jsonb_build_object('success', false, 'code', 'invalid_payment_intent');
    end if;

    update public.payments
    set provider_payment_id = coalesce(
      provider_payment_id,
      p_payment_intent_id
    )
    where id = v_payment.id
      and (
        provider_payment_id is null
        or provider_payment_id = p_payment_intent_id
      );
    if not found then
      return jsonb_build_object('success', false, 'code', 'payment_intent_conflict');
    end if;

    v_confirmation := public.confirm_card_payment(
      v_payment.id,
      'stripe_session:' || p_session_id,
      'stripe'
    );
    if not coalesce((v_confirmation->>'success')::boolean, false) then
      raise exception 'Stripe payment confirmation failed: %',
        coalesce(v_confirmation->>'code', 'unknown')
        using errcode = '40001';
    end if;

    v_result := jsonb_build_object(
      'action', 'confirmed',
      'confirmationReplay', coalesce(
        (v_confirmation->>'idempotentReplay')::boolean,
        false
      )
    );
  else
    perform sr.id
    from public.stock_reservations sr
    where sr.order_id = v_order.id
    order by sr.inventory_id
    for update;

    if v_payment.status in ('paid', 'refunded')
      or exists (
        select 1 from public.stock_reservations sr
        where sr.order_id = v_order.id and sr.status = 'consumed'
      )
    then
      v_result := jsonb_build_object('action', 'ignored_already_paid');
    else
      update public.stock_reservations
      set status = 'expired',
          expired_at = statement_timestamp(),
          resolution_key = 'stripe_session:' || p_session_id
      where order_id = v_order.id and status = 'active';
      get diagnostics v_changed = row_count;

      update public.payments
      set status = 'expired',
          expired_at = statement_timestamp(),
          failure_code = 'stripe_session_expired',
          failure_message = 'Sesiunea Stripe Checkout a expirat.'
      where id = v_payment.id and status = 'pending';

      if v_order.status = 'awaiting_payment' then
        update public.orders set status = 'cancelled' where id = v_order.id;
        insert into public.order_status_history (
          order_id, from_status, to_status, note
        ) values (
          v_order.id,
          'awaiting_payment',
          'cancelled',
          'Sesiunea Stripe Checkout a expirat.'
        );
      end if;

      v_result := jsonb_build_object(
        'action', 'expired',
        'releasedReservations', v_changed
      );
    end if;
  end if;

  insert into public.stripe_webhook_events (
    event_id,
    event_type,
    provider_checkout_session_id,
    payment_id,
    order_id,
    result
  ) values (
    p_event_id,
    p_event_type,
    p_session_id,
    v_payment.id,
    v_order.id,
    v_result
  );

  return jsonb_build_object(
    'success', true,
    'idempotentReplay', false,
    'eventId', p_event_id,
    'result', v_result
  );
end;
$$;

revoke all on function public.process_stripe_checkout_event(
  text, text, text, text, uuid, uuid, bigint, text, text, text
) from public, anon, authenticated;
grant execute on function public.process_stripe_checkout_event(
  text, text, text, text, uuid, uuid, bigint, text, text, text
) to service_role;

create or replace function public.get_order_confirmation(p_confirmation_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'found', true,
        'publicNumber', o.public_number,
        'totalMinor', o.total_minor,
        'currency', o.currency,
        'paymentMethod', o.payment_method,
        'paymentStatus', o.payment_status,
        'orderStatus', o.status,
        'shippingMethodName', o.shipping_method_name,
        'createdAt', o.created_at
      )
      from public.orders o
      where o.confirmation_token = p_confirmation_token
    ),
    jsonb_build_object('found', false)
  );
$$;

revoke all on function public.get_order_confirmation(uuid) from public;
grant execute on function public.get_order_confirmation(uuid)
to anon, authenticated;

commit;
