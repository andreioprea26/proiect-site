begin;

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  carrier text constraint shipments_carrier_valid check (
    carrier is null or (carrier = btrim(carrier) and carrier <> '' and length(carrier) <= 120)
  ),
  tracking_number text constraint shipments_tracking_number_valid check (
    tracking_number is null or (
      tracking_number = btrim(tracking_number)
      and tracking_number <> ''
      and length(tracking_number) <= 160
    )
  ),
  tracking_url text constraint shipments_tracking_url_valid check (
    tracking_url is null or (
      tracking_url = btrim(tracking_url)
      and length(tracking_url) <= 2048
      and tracking_url ~ '^https://[^[:space:]]+$'
    )
  ),
  shipped_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  action text not null constraint shipment_events_action_valid
    check (action in ('created', 'updated', 'shipped')),
  request_id uuid not null unique,
  actor_user_id uuid references auth.users (id) on delete set null,
  carrier text,
  tracking_number text,
  tracking_url text,
  created_at timestamptz not null default now()
);

create index shipment_events_order_created_idx
  on public.shipment_events (order_id, created_at desc);

create trigger shipments_set_updated_at
before update on public.shipments
for each row execute function public.set_updated_at();

alter table public.shipments enable row level security;
alter table public.shipment_events enable row level security;
revoke all on table public.shipments, public.shipment_events
from anon, authenticated;
grant select on table public.shipments, public.shipment_events to authenticated;

create policy shipments_admin_select
on public.shipments for select to authenticated
using ((select public.is_admin()));

create policy shipment_events_admin_select
on public.shipment_events for select to authenticated
using ((select public.is_admin()));

create function public.shipping_requires_tracking(p_code text, p_name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select not (
    coalesce(p_code, '') ~* '(pickup|ridicare|personal)'
    or coalesce(p_name, '') ~* '(pickup|ridicare|personal)'
  );
$$;

revoke all on function public.shipping_requires_tracking(text, text)
from public, anon, authenticated;

create function public.configure_admin_shipment(
  p_order_id uuid,
  p_carrier text,
  p_tracking_number text,
  p_tracking_url text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_shipment public.shipments%rowtype;
  v_existing public.shipment_events%rowtype;
  v_carrier text := nullif(btrim(p_carrier), '');
  v_tracking_number text := nullif(btrim(p_tracking_number), '');
  v_tracking_url text := nullif(btrim(p_tracking_url), '');
  v_action text;
begin
  if not public.is_admin() then
    return jsonb_build_object('success', false, 'code', 'unauthorized');
  end if;
  if p_order_id is null or p_request_id is null
    or (v_carrier is not null and length(v_carrier) > 120)
    or (v_tracking_number is not null and length(v_tracking_number) > 160)
    or (v_tracking_url is not null and (
      length(v_tracking_url) > 2048
      or v_tracking_url !~ '^https://[^[:space:]]+$'))
  then
    return jsonb_build_object('success', false, 'code', 'invalid_shipment');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 7));

  select se.* into v_existing from public.shipment_events se
  where se.request_id = p_request_id;
  if found then
    if v_existing.order_id = p_order_id
      and v_existing.action in ('created', 'updated')
      and v_existing.carrier is not distinct from v_carrier
      and v_existing.tracking_number is not distinct from v_tracking_number
      and v_existing.tracking_url is not distinct from v_tracking_url
    then
      return jsonb_build_object('success', true, 'idempotentReplay', true,
        'shipmentId', v_existing.shipment_id, 'orderId', p_order_id);
    end if;
    return jsonb_build_object('success', false, 'code', 'idempotency_conflict');
  end if;

  select o.* into v_order from public.orders o
  where o.id = p_order_id for update;
  if not found then
    return jsonb_build_object('success', false, 'code', 'order_not_found');
  end if;
  if v_order.status in ('completed', 'cancelled', 'refunded', 'returned') then
    return jsonb_build_object('success', false, 'code', 'shipment_locked');
  end if;
  if public.shipping_requires_tracking(
      v_order.shipping_method_code, v_order.shipping_method_name)
    and (v_carrier is null or v_tracking_number is null)
  then
    return jsonb_build_object('success', false, 'code', 'tracking_required');
  end if;

  select s.* into v_shipment from public.shipments s
  where s.order_id = p_order_id for update;
  if found then
    update public.shipments set
      carrier = v_carrier,
      tracking_number = v_tracking_number,
      tracking_url = v_tracking_url,
      updated_by = auth.uid()
    where id = v_shipment.id returning * into v_shipment;
    v_action := 'updated';
  else
    insert into public.shipments (
      order_id, carrier, tracking_number, tracking_url, created_by, updated_by
    ) values (
      p_order_id, v_carrier, v_tracking_number, v_tracking_url,
      auth.uid(), auth.uid()
    ) returning * into v_shipment;
    v_action := 'created';
  end if;

  insert into public.shipment_events (
    shipment_id, order_id, action, request_id, actor_user_id,
    carrier, tracking_number, tracking_url
  ) values (
    v_shipment.id, p_order_id, v_action, p_request_id, auth.uid(),
    v_carrier, v_tracking_number, v_tracking_url
  );

  return jsonb_build_object('success', true, 'idempotentReplay', false,
    'shipmentId', v_shipment.id, 'orderId', p_order_id, 'action', v_action);
end;
$$;

revoke all on function public.configure_admin_shipment(uuid, text, text, text, uuid)
from public, anon;
grant execute on function public.configure_admin_shipment(uuid, text, text, text, uuid)
to authenticated, service_role;

create function public.mark_admin_order_shipped(
  p_order_id uuid,
  p_request_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_shipment public.shipments%rowtype;
  v_existing public.shipment_events%rowtype;
  v_note text := nullif(btrim(p_note), '');
  v_shipped_at timestamptz := statement_timestamp();
  v_history_id uuid;
begin
  if not public.is_admin() then
    return jsonb_build_object('success', false, 'code', 'unauthorized');
  end if;
  if p_order_id is null or p_request_id is null
    or (v_note is not null and length(v_note) > 500)
  then return jsonb_build_object('success', false, 'code', 'invalid_request'); end if;

  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 7));

  select se.* into v_existing from public.shipment_events se
  where se.request_id = p_request_id;
  if found then
    if v_existing.order_id = p_order_id and v_existing.action = 'shipped' then
      return jsonb_build_object('success', true, 'idempotentReplay', true,
        'shipmentId', v_existing.shipment_id, 'orderId', p_order_id);
    end if;
    return jsonb_build_object('success', false, 'code', 'idempotency_conflict');
  end if;

  select o.* into v_order from public.orders o
  where o.id = p_order_id for update;
  if not found then return jsonb_build_object('success', false, 'code', 'order_not_found'); end if;

  select s.* into v_shipment from public.shipments s
  where s.order_id = p_order_id for update;
  if v_order.status = 'shipped' and v_shipment.id is not null then
    return jsonb_build_object('success', true, 'idempotentReplay', true,
      'shipmentId', v_shipment.id, 'orderId', p_order_id,
      'shippedAt', v_shipment.shipped_at);
  end if;
  if v_order.status <> 'ready' then
    return jsonb_build_object('success', false, 'code', 'invalid_ship_status');
  end if;
  if v_shipment.id is null then
    return jsonb_build_object('success', false, 'code', 'shipment_required');
  end if;
  if public.shipping_requires_tracking(
      v_order.shipping_method_code, v_order.shipping_method_name)
    and (v_shipment.carrier is null or v_shipment.tracking_number is null)
  then return jsonb_build_object('success', false, 'code', 'tracking_required'); end if;

  update public.shipments set shipped_at = coalesce(shipped_at, v_shipped_at),
    updated_by = auth.uid()
  where id = v_shipment.id returning * into v_shipment;
  update public.orders set status = 'shipped' where id = p_order_id;
  insert into public.order_status_history (
    order_id, from_status, to_status, actor_user_id, note, request_id
  ) values (
    p_order_id, 'ready', 'shipped', auth.uid(),
    coalesce(v_note, 'Comanda a fost marcată ca expediată.'), p_request_id
  ) returning id into v_history_id;
  insert into public.shipment_events (
    shipment_id, order_id, action, request_id, actor_user_id,
    carrier, tracking_number, tracking_url
  ) values (
    v_shipment.id, p_order_id, 'shipped', p_request_id, auth.uid(),
    v_shipment.carrier, v_shipment.tracking_number, v_shipment.tracking_url
  );

  return jsonb_build_object('success', true, 'idempotentReplay', false,
    'shipmentId', v_shipment.id, 'orderId', p_order_id,
    'historyId', v_history_id, 'shippedAt', v_shipment.shipped_at);
end;
$$;

revoke all on function public.mark_admin_order_shipped(uuid, uuid, text)
from public, anon;
grant execute on function public.mark_admin_order_shipped(uuid, uuid, text)
to authenticated, service_role;

create function public.cancel_admin_order(
  p_order_id uuid,
  p_request_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_existing public.order_status_history%rowtype;
  v_note text := nullif(btrim(p_note), '');
  v_source record;
  v_restocked integer := 0;
  v_movements integer := 0;
  v_history_id uuid;
begin
  if not public.is_admin() then
    return jsonb_build_object('success', false, 'code', 'unauthorized');
  end if;
  if p_order_id is null or p_request_id is null
    or (v_note is not null and length(v_note) > 500)
  then return jsonb_build_object('success', false, 'code', 'invalid_request'); end if;

  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 7));

  select h.* into v_existing from public.order_status_history h
  where h.request_id = p_request_id;
  if found then
    if v_existing.order_id = p_order_id and v_existing.to_status = 'cancelled'
      and v_existing.note is not distinct from coalesce(v_note, 'Comandă COD anulată de administrator.')
    then return jsonb_build_object('success', true, 'idempotentReplay', true,
      'orderId', p_order_id, 'historyId', v_existing.id);
    end if;
    return jsonb_build_object('success', false, 'code', 'idempotency_conflict');
  end if;

  select o.* into v_order from public.orders o
  where o.id = p_order_id for update;
  if not found then return jsonb_build_object('success', false, 'code', 'order_not_found'); end if;
  if v_order.status = 'cancelled' then
    return jsonb_build_object('success', true, 'idempotentReplay', true,
      'orderId', p_order_id, 'restockedQuantity', 0, 'reversalMovements', 0);
  end if;
  if v_order.payment_method = 'card' then
    if v_order.payment_status = 'paid' then
      return jsonb_build_object('success', false, 'code', 'refund_required');
    end if;
    return jsonb_build_object('success', false, 'code', 'stripe_expiration_required');
  end if;
  if v_order.payment_status in ('paid', 'refunded') then
    return jsonb_build_object('success', false, 'code', 'refund_required');
  end if;
  if v_order.status not in ('new', 'awaiting_customization_review', 'in_progress', 'ready') then
    return jsonb_build_object('success', false, 'code', 'invalid_cancel_status');
  end if;

  for v_source in
    select im.inventory_id, (-sum(im.quantity_delta))::integer as quantity
    from public.inventory_movements im
    where im.quantity_delta < 0
      and im.context->>'source' = 'place_cod_order'
      and im.context->>'orderId' = p_order_id::text
    group by im.inventory_id
    order by im.inventory_id
  loop
    perform public.adjust_inventory(
      v_source.inventory_id,
      v_source.quantity,
      'Anulare comandă ramburs',
      auth.uid(),
      jsonb_build_object('source', 'admin_cod_cancellation',
        'orderId', p_order_id, 'cancellationRequestId', p_request_id)
    );
    v_restocked := v_restocked + v_source.quantity;
    v_movements := v_movements + 1;

    update public.products p set availability_status = 'unique'
    where p.product_type = 'unique'
      and exists (
        select 1 from public.inventory i
        left join public.product_variants pv on pv.id = i.variant_id
        where i.id = v_source.inventory_id
          and coalesce(i.product_id, pv.product_id) = p.id
          and i.quantity > 0
      );
  end loop;

  update public.orders set status = 'cancelled' where id = p_order_id;
  insert into public.order_status_history (
    order_id, from_status, to_status, actor_user_id, note, request_id
  ) values (
    p_order_id, v_order.status, 'cancelled', auth.uid(),
    coalesce(v_note, 'Comandă COD anulată de administrator.'), p_request_id
  ) returning id into v_history_id;

  return jsonb_build_object('success', true, 'idempotentReplay', false,
    'orderId', p_order_id, 'historyId', v_history_id,
    'restockedQuantity', v_restocked, 'reversalMovements', v_movements);
end;
$$;

revoke all on function public.cancel_admin_order(uuid, uuid, text)
from public, anon;
grant execute on function public.cancel_admin_order(uuid, uuid, text)
to authenticated, service_role;

-- Stripe state is fetched and, when needed, the Checkout Session is expired
-- by trusted server code. This wrapper reuses 6C reconciliation and attaches
-- the admin actor/request to the resulting cancellation in one transaction.
create function public.reconcile_admin_stripe_cancellation(
  p_payment_id uuid,
  p_session_id text,
  p_session_status text,
  p_payment_status text,
  p_payment_intent_id text,
  p_amount_total bigint,
  p_currency text,
  p_mode text,
  p_actor_user_id uuid,
  p_request_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_existing public.order_status_history%rowtype;
  v_history_id uuid;
  v_result jsonb;
  v_action text;
  v_note text := nullif(btrim(p_note), '');
begin
  if p_actor_user_id is null or p_request_id is null
    or not exists (select 1 from public.user_roles ur
      where ur.user_id = p_actor_user_id and ur.role = 'admin')
  then return jsonb_build_object('success', false, 'code', 'admin_required'); end if;
  if v_note is not null and length(v_note) > 500 then
    return jsonb_build_object('success', false, 'code', 'invalid_note');
  end if;

  select p.* into v_payment from public.payments p
  where p.id = p_payment_id for update;
  if not found then return jsonb_build_object('success', false, 'code', 'payment_not_found'); end if;

  select h.* into v_existing from public.order_status_history h
  where h.request_id = p_request_id;
  if found then
    if v_existing.order_id = v_payment.order_id and v_existing.to_status = 'cancelled' then
      return jsonb_build_object('success', true, 'idempotentReplay', true,
        'orderId', v_payment.order_id, 'historyId', v_existing.id,
        'action', 'expired');
    end if;
    return jsonb_build_object('success', false, 'code', 'idempotency_conflict');
  end if;

  v_result := public.reconcile_stale_stripe_payment(
    p_payment_id, p_session_id, p_session_status, p_payment_status,
    p_payment_intent_id, p_amount_total, p_currency, p_mode
  );
  if not coalesce((v_result->>'success')::boolean, false) then return v_result; end if;
  v_action := v_result->>'action';
  if v_action in ('confirmed', 'preserved_terminal') then
    return jsonb_build_object('success', false,
      'code', 'payment_completed_refund_required');
  end if;
  if v_action <> 'expired' then
    return jsonb_build_object('success', false, 'code', 'stripe_session_still_open');
  end if;

  select h.id into v_history_id from public.order_status_history h
  where h.order_id = v_payment.order_id and h.to_status = 'cancelled'
    and h.request_id is null
  order by h.created_at desc limit 1 for update;
  if v_history_id is not null then
    update public.order_status_history set
      actor_user_id = p_actor_user_id,
      request_id = p_request_id,
      note = coalesce(v_note, 'Sesiunea Stripe a fost expirată de administrator și reconciliată.')
    where id = v_history_id;
  end if;

  return jsonb_build_object('success', true, 'idempotentReplay', false,
    'orderId', v_payment.order_id, 'historyId', v_history_id,
    'action', 'expired');
end;
$$;

revoke all on function public.reconcile_admin_stripe_cancellation(
  uuid, text, text, text, text, bigint, text, text, uuid, uuid, text
) from public, anon, authenticated;
grant execute on function public.reconcile_admin_stripe_cancellation(
  uuid, text, text, text, text, bigint, text, text, uuid, uuid, text
) to service_role;

-- Keep 7A transitions for ordinary workflow changes, but force shipping and
-- cancellation through the specialized atomic operations above.
alter function public.transition_admin_order_status(
  uuid, public.order_status, uuid, text
) rename to transition_admin_order_status_7a_internal;

revoke all on function public.transition_admin_order_status_7a_internal(
  uuid, public.order_status, uuid, text
) from public, anon, authenticated, service_role;

create function public.transition_admin_order_status(
  p_order_id uuid,
  p_to_status public.order_status,
  p_request_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('success', false, 'code', 'unauthorized');
  end if;
  if p_to_status = 'shipped' then
    return jsonb_build_object('success', false,
      'code', 'specialized_shipment_required');
  end if;
  if p_to_status = 'cancelled' then
    return jsonb_build_object('success', false,
      'code', 'specialized_cancellation_required');
  end if;
  return public.transition_admin_order_status_7a_internal(
    p_order_id, p_to_status, p_request_id, p_note
  );
end;
$$;

revoke all on function public.transition_admin_order_status(
  uuid, public.order_status, uuid, text
) from public, anon;
grant execute on function public.transition_admin_order_status(
  uuid, public.order_status, uuid, text
) to authenticated, service_role;

commit;
