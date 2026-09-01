begin;

create type public.payment_refund_status as enum (
  'pending',
  'succeeded',
  'failed'
);

create table public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete restrict,
  provider text not null default 'stripe'
    constraint payment_refunds_provider_stripe check (provider = 'stripe'),
  provider_refund_id text,
  provider_payment_intent_id text not null,
  amount_minor bigint not null
    constraint payment_refunds_amount_positive check (amount_minor > 0),
  currency text not null
    constraint payment_refunds_currency_ron check (currency = 'RON'),
  status public.payment_refund_status not null default 'pending',
  idempotency_key text not null unique,
  reason text,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb
    constraint payment_refunds_metadata_object
    check (jsonb_typeof(metadata) = 'object'),
  succeeded_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_refunds_provider_refund_valid check (
    provider_refund_id is null or (
      provider_refund_id = btrim(provider_refund_id)
      and provider_refund_id ~ '^re_[A-Za-z0-9_]+$'
      and length(provider_refund_id) <= 255
    )
  ),
  constraint payment_refunds_payment_intent_valid check (
    provider_payment_intent_id = btrim(provider_payment_intent_id)
    and provider_payment_intent_id ~ '^pi_[A-Za-z0-9_]+$'
    and length(provider_payment_intent_id) <= 255
  ),
  constraint payment_refunds_idempotency_valid check (
    idempotency_key = btrim(idempotency_key)
    and idempotency_key <> ''
    and length(idempotency_key) <= 255
  ),
  constraint payment_refunds_reason_valid check (
    reason is null or (
      reason = btrim(reason) and reason <> '' and length(reason) <= 500
    )
  ),
  constraint payment_refunds_failure_reason_valid check (
    failure_reason is null or (
      failure_reason = btrim(failure_reason)
      and failure_reason <> ''
      and length(failure_reason) <= 1000
    )
  ),
  constraint payment_refunds_status_timestamps_consistent check (
    (status = 'pending' and succeeded_at is null and failed_at is null)
    or (status = 'succeeded' and succeeded_at is not null and failed_at is null)
    or (status = 'failed' and succeeded_at is null and failed_at is not null)
  )
);

create unique index payment_refunds_provider_id_unique_idx
  on public.payment_refunds (provider, provider_refund_id)
  where provider_refund_id is not null;

create unique index payment_refunds_one_pending_full_idx
  on public.payment_refunds (payment_id)
  where status = 'pending' and metadata->>'kind' = 'full';

create index payment_refunds_payment_created_idx
  on public.payment_refunds (payment_id, created_at desc);

create trigger payment_refunds_set_updated_at
before update on public.payment_refunds
for each row execute function public.set_updated_at();

alter table public.payment_refunds enable row level security;
revoke all on table public.payment_refunds from anon, authenticated;
grant select on table public.payment_refunds to authenticated;

create policy payment_refunds_admin_select
on public.payment_refunds
for select
to authenticated
using ((select public.is_admin()));

-- Webhook rows are final audit outcomes. Retryable failures are deliberately
-- not inserted, so Stripe can retry them. Business references are nullable so
-- an authentic event that does not belong to this project can be acknowledged.
alter table public.stripe_webhook_events
  drop constraint stripe_webhook_events_type_valid,
  alter column provider_checkout_session_id drop not null,
  alter column payment_id drop not null,
  alter column order_id drop not null;

alter table public.stripe_webhook_events
  add column provider_refund_id text,
  add column classification text not null default 'processed',
  add column reason text,
  add constraint stripe_webhook_events_type_valid check (
    event_type in (
      'checkout.session.completed',
      'checkout.session.expired',
      'refund.created',
      'refund.updated',
      'refund.failed'
    )
  ),
  add constraint stripe_webhook_events_session_optional_valid check (
    provider_checkout_session_id is null or (
      provider_checkout_session_id = btrim(provider_checkout_session_id)
      and provider_checkout_session_id ~ '^cs_test_[A-Za-z0-9_]+$'
      and length(provider_checkout_session_id) <= 255
    )
  ),
  add constraint stripe_webhook_events_refund_valid check (
    provider_refund_id is null or (
      provider_refund_id = btrim(provider_refund_id)
      and provider_refund_id ~ '^re_[A-Za-z0-9_]+$'
      and length(provider_refund_id) <= 255
    )
  ),
  add constraint stripe_webhook_events_classification_valid check (
    classification in ('processed', 'ignored_unmatched', 'rejected_permanent')
  ),
  add constraint stripe_webhook_events_reason_valid check (
    reason is null or (
      reason = btrim(reason) and reason <> '' and length(reason) <= 500
    )
  );

drop function public.process_stripe_checkout_event(
  text, text, text, text, uuid, uuid, bigint, text, text, text
);

-- An attached Checkout Session remains an authoritative hold even after the
-- local TTL. Only a Stripe expiry transition or a verified reconciliation may
-- make it available again.
create or replace function public.protect_stock_reservation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_physical_quantity integer;
  v_other_reserved bigint;
begin
  if new.status <> 'active'::public.stock_reservation_status then
    return new;
  end if;

  if new.expires_at <= statement_timestamp() then
    raise exception 'An active reservation must expire in the future.'
      using errcode = '23514';
  end if;

  select i.quantity into v_physical_quantity
  from public.inventory i
  where i.id = new.inventory_id
  for update;
  if not found then
    raise exception 'Reservation inventory does not exist.'
      using errcode = '23503';
  end if;

  select coalesce(sum(sr.quantity), 0)
  into v_other_reserved
  from public.stock_reservations sr
  join public.payments p on p.id = sr.payment_id
  where sr.inventory_id = new.inventory_id
    and sr.id is distinct from new.id
    and sr.status = 'active'::public.stock_reservation_status
    and (
      sr.expires_at > statement_timestamp()
      or (p.provider = 'stripe' and p.provider_checkout_session_id is not null)
    );

  if v_other_reserved + new.quantity::bigint > v_physical_quantity::bigint then
    raise exception 'Reservation exceeds effective available inventory.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.protect_reserved_inventory()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_reserved_quantity bigint;
begin
  select coalesce(sum(sr.quantity), 0)
  into v_reserved_quantity
  from public.stock_reservations sr
  join public.payments p on p.id = sr.payment_id
  where sr.inventory_id = new.id
    and sr.status = 'active'::public.stock_reservation_status
    and (
      sr.expires_at > statement_timestamp()
      or (p.provider = 'stripe' and p.provider_checkout_session_id is not null)
    );

  if new.quantity::bigint < v_reserved_quantity then
    raise exception 'Inventory quantity cannot be reduced below active reservations.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.quote_checkout(p_lines jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote jsonb;
  v_line jsonb;
  v_errors jsonb;
  v_inventory public.inventory%rowtype;
  v_reserved_quantity bigint;
  v_requested_quantity integer;
  v_checked_inventory_ids uuid[] := '{}'::uuid[];
begin
  v_quote := public.quote_checkout_without_reservations(p_lines);
  if not coalesce((v_quote->>'valid')::boolean, false) then
    return v_quote;
  end if;

  v_errors := coalesce(v_quote->'errors', '[]'::jsonb);
  for v_line in select value from jsonb_array_elements(v_quote->'lines')
  loop
    v_inventory := null;
    if nullif(v_line->'variant', 'null'::jsonb) is not null then
      select i.* into v_inventory from public.inventory i
      where i.variant_id = (v_line#>>'{variant,id}')::uuid;
    else
      select i.* into v_inventory from public.inventory i
      where i.product_id = (v_line->>'productId')::uuid;
    end if;

    if v_inventory.id is not null
      and not (v_inventory.id = any(v_checked_inventory_ids))
    then
      select coalesce(sum(sr.quantity), 0)
      into v_reserved_quantity
      from public.stock_reservations sr
      join public.payments p on p.id = sr.payment_id
      where sr.inventory_id = v_inventory.id
        and sr.status = 'active'::public.stock_reservation_status
        and (
          sr.expires_at > statement_timestamp()
          or (p.provider = 'stripe' and p.provider_checkout_session_id is not null)
        );

      select sum((q->>'quantity')::integer)::integer
      into v_requested_quantity
      from jsonb_array_elements(v_quote->'lines') q
      where (
        v_inventory.variant_id is not null
        and nullif(q->'variant', 'null'::jsonb) is not null
        and v_inventory.variant_id = (q#>>'{variant,id}')::uuid
      ) or (
        v_inventory.product_id is not null
        and nullif(q->'variant', 'null'::jsonb) is null
        and v_inventory.product_id = (q->>'productId')::uuid
      );

      if v_inventory.quantity::bigint - v_reserved_quantity
        < v_requested_quantity::bigint
      then
        v_errors := v_errors || jsonb_build_array(jsonb_build_object(
          'key', v_line->>'key',
          'code', 'insufficient_stock',
          'message', 'Cantitatea solicitată nu mai este disponibilă.'
        ));
      end if;
      v_checked_inventory_ids := array_append(v_checked_inventory_ids, v_inventory.id);
    end if;
  end loop;

  return jsonb_set(
    jsonb_set(v_quote, '{errors}', v_errors, true),
    '{valid}', to_jsonb(jsonb_array_length(v_errors) = 0), true
  );
end;
$$;

create or replace function public.expire_stock_reservations(
  p_as_of timestamptz default statement_timestamp()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_expired_reservations integer := 0;
  v_expired_orders integer := 0;
  v_changed integer;
begin
  if p_as_of is null then
    return jsonb_build_object('success', false, 'code', 'invalid_expiration_time');
  end if;

  for v_order_id in
    select p.order_id
    from public.payments p
    join public.orders o on o.id = p.order_id
    where p.status = 'pending'
      and p.pending_expires_at <= p_as_of
      and o.status = 'awaiting_payment'
      and p.provider_checkout_session_id is null
    order by p.order_id
  loop
    perform o.id from public.orders o where o.id = v_order_id for update;
    perform p.id from public.payments p where p.order_id = v_order_id for update;
    perform sr.id from public.stock_reservations sr
      where sr.order_id = v_order_id order by sr.inventory_id for update;
    perform i.id from public.inventory i
      join public.stock_reservations sr on sr.inventory_id = i.id
      where sr.order_id = v_order_id and sr.status = 'active'
      order by i.id for update of i;

    update public.stock_reservations
    set status = 'expired', expired_at = p_as_of,
        resolution_key = 'local_ttl_before_stripe_session'
    where order_id = v_order_id and status = 'active';
    get diagnostics v_changed = row_count;
    v_expired_reservations := v_expired_reservations + v_changed;

    update public.payments set status = 'expired', expired_at = p_as_of,
      failure_code = 'reservation_expired_before_stripe_session',
      failure_message = 'Rezervarea a expirat înainte de crearea sesiunii Stripe.'
    where order_id = v_order_id and status = 'pending';

    update public.orders set status = 'cancelled'
    where id = v_order_id and status = 'awaiting_payment';
    if found then
      v_expired_orders := v_expired_orders + 1;
      insert into public.order_status_history (order_id, from_status, to_status, note)
      values (v_order_id, 'awaiting_payment', 'cancelled',
        'Rezervarea a expirat înainte de crearea sesiunii Stripe.');
    end if;
  end loop;

  return jsonb_build_object('success', true,
    'expiredReservations', v_expired_reservations,
    'expiredOrders', v_expired_orders);
end;
$$;

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
  p_mode text,
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
  v_confirmation jsonb;
  v_result jsonb;
  v_classification text := 'processed';
  v_reason text;
  v_changed integer := 0;
  v_recovered boolean := false;
begin
  if p_event_id is null or p_event_id !~ '^evt_[A-Za-z0-9_]+$'
    or length(p_event_id) > 255
    or p_event_type not in ('checkout.session.completed', 'checkout.session.expired')
    or p_session_id is null or p_session_id !~ '^cs_test_[A-Za-z0-9_]+$'
    or length(p_session_id) > 255
  then
    return jsonb_build_object('success', false, 'code', 'invalid_event',
      'retryable', false);
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_event_id, 2));
  select jsonb_build_object(
    'success', true, 'idempotentReplay', true,
    'classification', swe.classification, 'eventId', swe.event_id,
    'result', swe.result
  ) into v_result
  from public.stripe_webhook_events swe where swe.event_id = p_event_id;
  if found then return v_result; end if;

  select p.* into v_payment
  from public.payments p
  where p.provider = 'stripe' and p.provider_checkout_session_id = p_session_id;

  if not found and p_payment_id is not null and p_order_id is not null then
    select p.* into v_payment
    from public.payments p
    where p.id = p_payment_id and p.order_id = p_order_id
      and p.provider in ('internal', 'stripe')
      and (p.provider_checkout_session_id is null
        or p.provider_checkout_session_id = p_session_id);
    v_recovered := found;
  end if;

  if v_payment.id is null then
    v_classification := 'ignored_unmatched';
    v_reason := 'session_not_found';
    v_result := jsonb_build_object('action', 'ignored_unmatched');
    insert into public.stripe_webhook_events (
      event_id, event_type, provider_checkout_session_id,
      classification, reason, result
    ) values (p_event_id, p_event_type, p_session_id,
      v_classification, v_reason, v_result);
    return jsonb_build_object('success', true, 'idempotentReplay', false,
      'classification', v_classification, 'eventId', p_event_id, 'result', v_result);
  end if;

  select o.* into v_order from public.orders o
  where o.id = v_payment.order_id for update;
  select p.* into v_payment from public.payments p
  where p.id = v_payment.id and p.order_id = v_order.id for update;

  if p_payment_id is distinct from v_payment.id
    or p_order_id is distinct from v_order.id
    or v_order.payment_method <> 'card'
    or p_mode <> 'payment'
    or p_amount_total is distinct from v_payment.amount_minor
    or upper(coalesce(p_currency, '')) <> v_payment.currency
    or (v_payment.provider_checkout_session_id is not null
      and v_payment.provider_checkout_session_id <> p_session_id)
  then
    v_classification := 'rejected_permanent';
    v_reason := 'reconciliation_failed';
    v_result := jsonb_build_object('action', 'rejected_permanent', 'code', v_reason);
    insert into public.stripe_webhook_events (
      event_id, event_type, provider_checkout_session_id, payment_id, order_id,
      classification, reason, result
    ) values (p_event_id, p_event_type, p_session_id, v_payment.id, v_order.id,
      v_classification, v_reason, v_result);
    return jsonb_build_object('success', true, 'idempotentReplay', false,
      'classification', v_classification, 'eventId', p_event_id, 'result', v_result);
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_payment.id::text, 3));

  if v_payment.provider_checkout_session_id is null then
    update public.payments
    set provider = 'stripe', provider_checkout_session_id = p_session_id,
        pending_expires_at = greatest(
          pending_expires_at,
          coalesce(p_session_expires_at, statement_timestamp())
            + public.stripe_reservation_expiry_margin()
        ),
        metadata = metadata || jsonb_build_object(
          'stripeSessionIdRecoveredByWebhook', p_session_id,
          'stripeSessionExpiresAt', p_session_expires_at
        )
    where id = v_payment.id;
    update public.stock_reservations
    set expires_at = greatest(expires_at,
          coalesce(p_session_expires_at, statement_timestamp())
            + public.stripe_reservation_expiry_margin()),
        metadata = metadata || jsonb_build_object(
          'stripeSessionId', p_session_id,
          'stripeSessionRecoveredByWebhook', true,
          'stripeSessionExpiresAt', p_session_expires_at
        )
    where payment_id = v_payment.id and status = 'active';
  end if;

  if p_event_type = 'checkout.session.completed' then
    if p_payment_status <> 'paid' then
      v_classification := 'rejected_permanent';
      v_reason := 'payment_not_paid';
      v_result := jsonb_build_object('action', 'rejected_permanent', 'code', v_reason);
    elsif p_payment_intent_id is null
      or p_payment_intent_id !~ '^pi_[A-Za-z0-9_]+$'
      or length(p_payment_intent_id) > 255
    then
      v_classification := 'rejected_permanent';
      v_reason := 'invalid_payment_intent';
      v_result := jsonb_build_object('action', 'rejected_permanent', 'code', v_reason);
    elsif v_payment.provider_payment_id is not null
      and v_payment.provider_payment_id <> p_payment_intent_id
    then
      v_classification := 'rejected_permanent';
      v_reason := 'payment_intent_conflict';
      v_result := jsonb_build_object('action', 'rejected_permanent', 'code', v_reason);
    elsif v_payment.status = 'refunded' or v_order.status = 'refunded' then
      v_result := jsonb_build_object('action', 'ignored_terminal_refunded');
    elsif v_payment.status = 'paid' then
      v_result := jsonb_build_object('action', 'ignored_already_paid');
    elsif v_payment.status <> 'pending' then
      v_classification := 'rejected_permanent';
      v_reason := 'payment_not_confirmable';
      v_result := jsonb_build_object('action', 'rejected_permanent', 'code', v_reason);
    else
      update public.payments set provider_payment_id = p_payment_intent_id
      where id = v_payment.id;
      -- A verified paid Session authoritatively extends its hold long enough
      -- for the atomic consume, even if the local margin elapsed.
      update public.stock_reservations
      set expires_at = greatest(expires_at, statement_timestamp() + interval '5 minutes')
      where payment_id = v_payment.id and status = 'active';

      v_confirmation := public.confirm_card_payment(
        v_payment.id, 'stripe_session:' || p_session_id, 'stripe'
      );
      if not coalesce((v_confirmation->>'success')::boolean, false) then
        raise exception 'Stripe payment confirmation failed: %',
          coalesce(v_confirmation->>'code', 'unknown') using errcode = '40001';
      end if;
      v_result := jsonb_build_object('action', 'confirmed',
        'orphanSessionRecovered', v_recovered,
        'confirmationReplay', coalesce(
          (v_confirmation->>'idempotentReplay')::boolean, false));
    end if;
  else
    perform sr.id from public.stock_reservations sr
      where sr.order_id = v_order.id order by sr.inventory_id for update;
    if v_payment.status in ('paid', 'refunded')
      or v_order.status = 'refunded'
      or exists (select 1 from public.stock_reservations sr
        where sr.order_id = v_order.id and sr.status = 'consumed')
    then
      v_result := jsonb_build_object('action',
        case when v_payment.status = 'refunded' or v_order.status = 'refunded'
          then 'ignored_terminal_refunded' else 'ignored_already_paid' end);
    elsif v_payment.status = 'expired' then
      v_result := jsonb_build_object('action', 'ignored_already_expired');
    else
      update public.stock_reservations
      set status = 'expired', expired_at = statement_timestamp(),
          resolution_key = 'stripe_session:' || p_session_id
      where order_id = v_order.id and status = 'active';
      get diagnostics v_changed = row_count;
      update public.payments set status = 'expired',
        expired_at = statement_timestamp(), failure_code = 'stripe_session_expired',
        failure_message = 'Sesiunea Stripe Checkout a expirat.'
      where id = v_payment.id and status = 'pending';
      if v_order.status = 'awaiting_payment' then
        update public.orders set status = 'cancelled' where id = v_order.id;
        insert into public.order_status_history (order_id, from_status, to_status, note)
        values (v_order.id, 'awaiting_payment', 'cancelled',
          'Sesiunea Stripe Checkout a expirat.');
      end if;
      v_result := jsonb_build_object('action', 'expired',
        'orphanSessionRecovered', v_recovered,
        'releasedReservations', v_changed);
    end if;
  end if;

  insert into public.stripe_webhook_events (
    event_id, event_type, provider_checkout_session_id, payment_id, order_id,
    classification, reason, result
  ) values (p_event_id, p_event_type, p_session_id, v_payment.id, v_order.id,
    v_classification, v_reason, v_result);
  return jsonb_build_object('success', true, 'idempotentReplay', false,
    'classification', v_classification, 'eventId', p_event_id, 'result', v_result);
end;
$$;

revoke all on function public.process_stripe_checkout_event(
  text, text, text, text, uuid, uuid, bigint, text, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.process_stripe_checkout_event(
  text, text, text, text, uuid, uuid, bigint, text, text, text, timestamptz
) to service_role;

create function public.list_stale_stripe_reservations(p_limit integer default 50)
returns table (
  payment_id uuid,
  order_id uuid,
  provider_checkout_session_id text
)
language sql
security definer
set search_path = ''
as $$
  select distinct p.id, p.order_id, p.provider_checkout_session_id
  from public.payments p
  join public.stock_reservations sr on sr.payment_id = p.id
  where p.provider = 'stripe'
    and p.provider_checkout_session_id is not null
    and p.status = 'pending'
    and sr.status = 'active'
    and sr.expires_at <= statement_timestamp()
  order by p.id
  limit greatest(0, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function public.list_stale_stripe_reservations(integer)
from public, anon, authenticated;
grant execute on function public.list_stale_stripe_reservations(integer)
to service_role;

create function public.reconcile_stale_stripe_payment(
  p_payment_id uuid,
  p_session_id text,
  p_session_status text,
  p_payment_status text,
  p_payment_intent_id text,
  p_amount_total bigint,
  p_currency text,
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
  v_changed integer := 0;
begin
  select p.* into v_payment from public.payments p
  where p.id = p_payment_id for update;
  if not found then return jsonb_build_object('success', false, 'code', 'payment_not_found'); end if;
  select o.* into v_order from public.orders o
  where o.id = v_payment.order_id for update;

  if v_payment.provider <> 'stripe'
    or v_payment.provider_checkout_session_id is distinct from p_session_id
    or v_order.payment_method <> 'card'
    or p_mode <> 'payment'
    or p_amount_total is distinct from v_payment.amount_minor
    or upper(coalesce(p_currency, '')) <> v_payment.currency
  then
    return jsonb_build_object('success', false, 'code', 'reconciliation_failed');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_payment.id::text, 3));
  if v_payment.status in ('paid', 'refunded') then
    return jsonb_build_object('success', true, 'action', 'preserved_terminal');
  end if;

  if p_session_status = 'expired' then
    perform sr.id from public.stock_reservations sr
      where sr.payment_id = v_payment.id order by sr.inventory_id for update;
    update public.stock_reservations set status = 'expired',
      expired_at = statement_timestamp(),
      resolution_key = 'stripe_reconciliation:' || p_session_id
    where payment_id = v_payment.id and status = 'active';
    get diagnostics v_changed = row_count;
    update public.payments set status = 'expired', expired_at = statement_timestamp(),
      failure_code = 'stripe_session_expired_reconciled',
      failure_message = 'Expirarea sesiunii Stripe a fost reconciliată server-side.'
    where id = v_payment.id and status = 'pending';
    if v_order.status = 'awaiting_payment' then
      update public.orders set status = 'cancelled' where id = v_order.id;
      insert into public.order_status_history (order_id, from_status, to_status, note)
      values (v_order.id, 'awaiting_payment', 'cancelled',
        'Expirarea sesiunii Stripe a fost reconciliată server-side.');
    end if;
    return jsonb_build_object('success', true, 'action', 'expired',
      'releasedReservations', v_changed);
  end if;

  if p_session_status = 'complete' and p_payment_status = 'paid' then
    if p_payment_intent_id is null or p_payment_intent_id !~ '^pi_[A-Za-z0-9_]+$'
      or (v_payment.provider_payment_id is not null
        and v_payment.provider_payment_id <> p_payment_intent_id)
    then
      return jsonb_build_object('success', false, 'code', 'payment_intent_conflict');
    end if;
    update public.payments set provider_payment_id = p_payment_intent_id
      where id = v_payment.id;
    update public.stock_reservations
      set expires_at = greatest(expires_at, statement_timestamp() + interval '5 minutes')
      where payment_id = v_payment.id and status = 'active';
    v_confirmation := public.confirm_card_payment(
      v_payment.id, 'stripe_session:' || p_session_id, 'stripe');
    if not coalesce((v_confirmation->>'success')::boolean, false) then
      raise exception 'Stripe reconciliation confirmation failed: %',
        coalesce(v_confirmation->>'code', 'unknown') using errcode = '40001';
    end if;
    return jsonb_build_object('success', true, 'action', 'confirmed');
  end if;

  return jsonb_build_object('success', true, 'action', 'preserved_open');
end;
$$;

revoke all on function public.reconcile_stale_stripe_payment(
  uuid, text, text, text, text, bigint, text, text
) from public, anon, authenticated;
grant execute on function public.reconcile_stale_stripe_payment(
  uuid, text, text, text, text, bigint, text, text
) to service_role;

create function public.prepare_full_stripe_refund(
  p_payment_id uuid,
  p_reason text default null,
  p_actor_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
  v_refund public.payment_refunds%rowtype;
  v_key text;
begin
  if p_payment_id is null
    or (p_reason is not null and (
      p_reason <> btrim(p_reason) or p_reason = '' or length(p_reason) > 500))
  then return jsonb_build_object('success', false, 'code', 'invalid_refund'); end if;

  perform pg_advisory_xact_lock(hashtextextended(p_payment_id::text, 4));
  select p.* into v_payment from public.payments p
    where p.id = p_payment_id for update;
  if not found then return jsonb_build_object('success', false, 'code', 'payment_not_found'); end if;
  select o.* into v_order from public.orders o
    where o.id = v_payment.order_id for update;

  if p_actor_user_id is not null and not exists (
    select 1 from public.user_roles ur
    where ur.user_id = p_actor_user_id and ur.role = 'admin'
  ) then return jsonb_build_object('success', false, 'code', 'admin_required'); end if;

  select pr.* into v_refund from public.payment_refunds pr
  where pr.payment_id = v_payment.id
    and pr.amount_minor = v_payment.amount_minor
    and pr.currency = v_payment.currency
    and pr.metadata->>'kind' = 'full'
  order by pr.created_at desc limit 1;
  if found then
    return jsonb_build_object('success', true, 'idempotentReplay', true,
      'refundId', v_refund.id, 'paymentId', v_payment.id,
      'orderId', v_order.id, 'providerPaymentIntentId', v_payment.provider_payment_id,
      'amountMinor', v_payment.amount_minor, 'currency', v_payment.currency,
      'status', v_refund.status, 'providerRefundId', v_refund.provider_refund_id,
      'idempotencyKey', v_refund.idempotency_key);
  end if;

  if v_payment.provider <> 'stripe'
    or v_payment.status <> 'paid'
    or v_order.payment_method <> 'card'
    or v_payment.provider_payment_id is null
    or v_payment.provider_payment_id !~ '^pi_[A-Za-z0-9_]+$'
  then return jsonb_build_object('success', false, 'code', 'payment_not_refundable'); end if;

  v_key := 'full_refund:' || v_payment.id::text;
  insert into public.payment_refunds (
    payment_id, provider_payment_intent_id, amount_minor, currency,
    idempotency_key, reason, metadata
  ) values (
    v_payment.id, v_payment.provider_payment_id, v_payment.amount_minor,
    v_payment.currency, v_key, p_reason,
    jsonb_build_object('kind', 'full', 'orderId', v_order.id,
      'actorUserId', p_actor_user_id)
  ) returning * into v_refund;

  return jsonb_build_object('success', true, 'idempotentReplay', false,
    'refundId', v_refund.id, 'paymentId', v_payment.id, 'orderId', v_order.id,
    'providerPaymentIntentId', v_payment.provider_payment_id,
    'amountMinor', v_payment.amount_minor, 'currency', v_payment.currency,
    'status', v_refund.status, 'providerRefundId', v_refund.provider_refund_id,
    'idempotencyKey', v_refund.idempotency_key);
end;
$$;

revoke all on function public.prepare_full_stripe_refund(uuid, text, uuid)
from public, anon, authenticated;
grant execute on function public.prepare_full_stripe_refund(uuid, text, uuid)
to service_role;

create function public.attach_stripe_refund(
  p_refund_id uuid,
  p_provider_refund_id text,
  p_provider_payment_intent_id text,
  p_amount_minor bigint,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_refund public.payment_refunds%rowtype;
begin
  select pr.* into v_refund from public.payment_refunds pr
    where pr.id = p_refund_id for update;
  if not found then return jsonb_build_object('success', false, 'code', 'refund_not_found'); end if;
  if p_provider_refund_id !~ '^re_[A-Za-z0-9_]+$'
    or p_provider_payment_intent_id is distinct from v_refund.provider_payment_intent_id
    or p_amount_minor is distinct from v_refund.amount_minor
    or upper(coalesce(p_currency, '')) <> v_refund.currency
  then return jsonb_build_object('success', false, 'code', 'refund_reconciliation_failed'); end if;
  if v_refund.provider_refund_id is not null
    and v_refund.provider_refund_id <> p_provider_refund_id
  then return jsonb_build_object('success', false, 'code', 'refund_id_conflict'); end if;
  update public.payment_refunds set provider_refund_id = p_provider_refund_id
    where id = v_refund.id;
  return jsonb_build_object('success', true,
    'idempotentReplay', v_refund.provider_refund_id is not null,
    'refundId', v_refund.id, 'providerRefundId', p_provider_refund_id);
end;
$$;

revoke all on function public.attach_stripe_refund(uuid, text, text, bigint, text)
from public, anon, authenticated;
grant execute on function public.attach_stripe_refund(uuid, text, text, bigint, text)
to service_role;

create function public.process_stripe_refund_event(
  p_event_id text,
  p_event_type text,
  p_provider_refund_id text,
  p_provider_payment_intent_id text,
  p_refund_id uuid,
  p_payment_id uuid,
  p_order_id uuid,
  p_amount_minor bigint,
  p_currency text,
  p_refund_status text,
  p_failure_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_refund public.payment_refunds%rowtype;
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
  v_result jsonb;
  v_classification text := 'processed';
  v_reason text;
  v_is_full boolean;
  v_from_status public.order_status;
begin
  if p_event_id is null or p_event_id !~ '^evt_[A-Za-z0-9_]+$'
    or length(p_event_id) > 255
    or p_event_type not in ('refund.created', 'refund.updated', 'refund.failed')
    or p_provider_refund_id is null
    or p_provider_refund_id !~ '^re_[A-Za-z0-9_]+$'
    or length(p_provider_refund_id) > 255
  then return jsonb_build_object('success', false, 'code', 'invalid_event',
    'retryable', false); end if;

  perform pg_advisory_xact_lock(hashtextextended(p_event_id, 2));
  select jsonb_build_object(
    'success', true, 'idempotentReplay', true,
    'classification', swe.classification, 'eventId', swe.event_id,
    'result', swe.result
  ) into v_result from public.stripe_webhook_events swe
  where swe.event_id = p_event_id;
  if found then return v_result; end if;

  select pr.* into v_refund from public.payment_refunds pr
  where pr.provider = 'stripe' and pr.provider_refund_id = p_provider_refund_id;
  if not found and p_refund_id is not null then
    select pr.* into v_refund from public.payment_refunds pr
    where pr.id = p_refund_id and pr.provider = 'stripe'
      and (pr.provider_refund_id is null
        or pr.provider_refund_id = p_provider_refund_id);
  end if;

  if v_refund.id is not null then
    select p.* into v_payment from public.payments p
      where p.id = v_refund.payment_id;
  elsif p_payment_id is not null then
    select p.* into v_payment from public.payments p
      where p.id = p_payment_id and p.provider = 'stripe';
  elsif p_provider_payment_intent_id is not null then
    select p.* into v_payment from public.payments p
      where p.provider = 'stripe'
        and p.provider_payment_id = p_provider_payment_intent_id;
  end if;

  if v_payment.id is null then
    v_classification := 'ignored_unmatched';
    v_reason := 'payment_not_found';
    v_result := jsonb_build_object('action', 'ignored_unmatched');
    insert into public.stripe_webhook_events (
      event_id, event_type, provider_refund_id, classification, reason, result
    ) values (p_event_id, p_event_type, p_provider_refund_id,
      v_classification, v_reason, v_result);
    return jsonb_build_object('success', true, 'idempotentReplay', false,
      'classification', v_classification, 'eventId', p_event_id, 'result', v_result);
  end if;

  select o.* into v_order from public.orders o
    where o.id = v_payment.order_id for update;
  select p.* into v_payment from public.payments p
    where p.id = v_payment.id and p.order_id = v_order.id for update;
  perform pg_advisory_xact_lock(hashtextextended(v_payment.id::text, 4));

  if p_payment_id is not null and p_payment_id <> v_payment.id
    or p_order_id is not null and p_order_id <> v_order.id
    or v_payment.provider <> 'stripe'
    or v_order.payment_method <> 'card'
    or p_provider_payment_intent_id is null
    or p_provider_payment_intent_id !~ '^pi_[A-Za-z0-9_]+$'
    or (v_payment.provider_payment_id is not null
      and p_provider_payment_intent_id <> v_payment.provider_payment_id)
    or upper(coalesce(p_currency, '')) <> v_payment.currency
    or p_amount_minor is null or p_amount_minor <= 0
    or p_amount_minor > v_payment.amount_minor
    or (v_refund.id is not null and (
      v_refund.payment_id <> v_payment.id
      or v_refund.provider_payment_intent_id <> p_provider_payment_intent_id
      or v_refund.amount_minor <> p_amount_minor
      or v_refund.currency <> upper(p_currency)
      or (v_refund.provider_refund_id is not null
        and v_refund.provider_refund_id <> p_provider_refund_id)))
  then
    v_classification := 'rejected_permanent';
    v_reason := 'refund_reconciliation_failed';
    v_result := jsonb_build_object('action', 'rejected_permanent', 'code', v_reason);
    insert into public.stripe_webhook_events (
      event_id, event_type, provider_refund_id, payment_id, order_id,
      classification, reason, result
    ) values (p_event_id, p_event_type, p_provider_refund_id,
      v_payment.id, v_order.id, v_classification, v_reason, v_result);
    return jsonb_build_object('success', true, 'idempotentReplay', false,
      'classification', v_classification, 'eventId', p_event_id, 'result', v_result);
  end if;

  if v_refund.id is null then
    insert into public.payment_refunds (
      payment_id, provider_refund_id, provider_payment_intent_id,
      amount_minor, currency, idempotency_key, reason, metadata
    ) values (
      v_payment.id, p_provider_refund_id, p_provider_payment_intent_id,
      p_amount_minor, upper(p_currency), 'stripe_refund:' || p_provider_refund_id,
      'Refund creat extern în Stripe.',
      jsonb_build_object('kind', case when p_amount_minor = v_payment.amount_minor
        then 'full' else 'partial' end, 'source', 'stripe_webhook')
    ) returning * into v_refund;
  elsif v_refund.provider_refund_id is null then
    update public.payment_refunds set provider_refund_id = p_provider_refund_id
    where id = v_refund.id returning * into v_refund;
  end if;

  if v_payment.provider_payment_id is null then
    update public.payments set provider_payment_id = p_provider_payment_intent_id
    where id = v_payment.id;
    v_payment.provider_payment_id := p_provider_payment_intent_id;
  end if;

  v_is_full := p_amount_minor = v_payment.amount_minor;
  if p_refund_status = 'succeeded' then
    update public.payment_refunds set status = 'succeeded',
      succeeded_at = coalesce(succeeded_at, statement_timestamp()),
      failed_at = null, failure_reason = null,
      metadata = metadata || jsonb_build_object('isFullRefund', v_is_full)
    where id = v_refund.id;

    if v_is_full then
      perform sr.id from public.stock_reservations sr
        where sr.payment_id = v_payment.id order by sr.inventory_id for update;
      update public.stock_reservations set status = 'released',
        released_at = statement_timestamp(),
        resolution_key = 'stripe_refund:' || p_provider_refund_id
      where payment_id = v_payment.id and status = 'active';

      update public.payments set provider_payment_id = p_provider_payment_intent_id,
        status = 'refunded', paid_at = coalesce(paid_at, statement_timestamp()),
        refunded_at = coalesce(refunded_at, statement_timestamp()),
        failed_at = null, expired_at = null,
        failure_code = null, failure_message = null
      where id = v_payment.id and status in ('pending', 'paid', 'refunded');

      v_from_status := v_order.status;
      if v_order.status <> 'refunded' then
        update public.orders set payment_status = 'refunded', status = 'refunded'
        where id = v_order.id;
        insert into public.order_status_history (order_id, from_status, to_status, note)
        values (v_order.id, v_from_status, 'refunded',
          'Refundul Stripe integral a fost confirmat. Inventarul nu a fost repus automat.');
      end if;
      v_result := jsonb_build_object('action', 'full_refund_succeeded',
        'inventoryRestocked', false);
    else
      v_result := jsonb_build_object('action', 'partial_refund_recorded',
        'orderMarkedRefunded', false);
    end if;
  elsif p_refund_status in ('failed', 'canceled')
    or p_event_type = 'refund.failed'
  then
    update public.payment_refunds set status = 'failed', succeeded_at = null,
      failed_at = coalesce(failed_at, statement_timestamp()),
      failure_reason = coalesce(nullif(left(btrim(p_failure_reason), 1000), ''),
        'Stripe refund failed.')
    where id = v_refund.id;
    v_result := jsonb_build_object('action', 'refund_failed',
      'paymentPreserved', v_payment.status);
  else
    update public.payment_refunds set status = 'pending',
      succeeded_at = null, failed_at = null, failure_reason = null
    where id = v_refund.id and status = 'pending';
    v_result := jsonb_build_object('action', 'refund_pending');
  end if;

  insert into public.stripe_webhook_events (
    event_id, event_type, provider_refund_id, payment_id, order_id,
    classification, reason, result
  ) values (p_event_id, p_event_type, p_provider_refund_id,
    v_payment.id, v_order.id, v_classification, v_reason, v_result);
  return jsonb_build_object('success', true, 'idempotentReplay', false,
    'classification', v_classification, 'eventId', p_event_id, 'result', v_result);
end;
$$;

revoke all on function public.process_stripe_refund_event(
  text, text, text, text, uuid, uuid, uuid, bigint, text, text, text
) from public, anon, authenticated;
grant execute on function public.process_stripe_refund_event(
  text, text, text, text, uuid, uuid, uuid, bigint, text, text, text
) to service_role;

-- Keep every privileged mutation server-only, including the underlying tables.
revoke all on table public.payment_refunds, public.stripe_webhook_events
from anon, authenticated;
grant select on table public.payment_refunds, public.stripe_webhook_events
to authenticated;

commit;
