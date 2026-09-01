begin;

alter table public.order_status_history
  add column request_id uuid;

create unique index order_status_history_request_id_unique_idx
  on public.order_status_history (request_id)
  where request_id is not null;

-- Order creation, Stripe webhooks and refund processing already run through
-- trusted security-definer functions. Removing direct browser writes closes
-- the older broad admin grants while preserving RLS-protected reads.
revoke insert, update, delete on table
  public.orders,
  public.order_items,
  public.order_status_history
from authenticated;

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
declare
  v_order public.orders%rowtype;
  v_existing public.order_status_history%rowtype;
  v_note text := nullif(btrim(p_note), '');
  v_allowed boolean := false;
  v_history_id uuid;
begin
  if not public.is_admin() then
    return jsonb_build_object('success', false, 'code', 'unauthorized');
  end if;

  if p_order_id is null or p_to_status is null or p_request_id is null then
    return jsonb_build_object('success', false, 'code', 'invalid_request');
  end if;
  if v_note is not null and length(v_note) > 500 then
    return jsonb_build_object('success', false, 'code', 'invalid_note');
  end if;

  select h.* into v_existing
  from public.order_status_history h
  where h.request_id = p_request_id;
  if found then
    if v_existing.order_id = p_order_id
      and v_existing.to_status = p_to_status
      and v_existing.note is not distinct from v_note
    then
      return jsonb_build_object(
        'success', true,
        'idempotentReplay', true,
        'orderId', p_order_id,
        'fromStatus', v_existing.from_status,
        'toStatus', v_existing.to_status,
        'historyId', v_existing.id
      );
    end if;
    return jsonb_build_object('success', false, 'code', 'idempotency_conflict');
  end if;

  select o.* into v_order
  from public.orders o
  where o.id = p_order_id
  for update;
  if not found then
    return jsonb_build_object('success', false, 'code', 'order_not_found');
  end if;

  -- Concurrent submissions with different request IDs still converge without
  -- a duplicate history row after the order lock is acquired.
  if v_order.status = p_to_status then
    return jsonb_build_object(
      'success', true,
      'idempotentReplay', true,
      'orderId', p_order_id,
      'fromStatus', v_order.status,
      'toStatus', v_order.status,
      'historyId', null
    );
  end if;

  v_allowed := case v_order.status
    when 'new' then p_to_status in (
      'awaiting_customization_review'::public.order_status,
      'in_progress'::public.order_status,
      'cancelled'::public.order_status
    )
    when 'paid' then p_to_status in (
      'awaiting_customization_review'::public.order_status,
      'in_progress'::public.order_status
    )
    when 'awaiting_customization_review' then p_to_status in (
      'in_progress'::public.order_status,
      'cancelled'::public.order_status
    )
    when 'in_progress' then p_to_status in (
      'ready'::public.order_status,
      'cancelled'::public.order_status
    )
    when 'ready' then p_to_status in (
      'shipped'::public.order_status,
      'cancelled'::public.order_status
    )
    when 'shipped' then p_to_status in (
      'completed'::public.order_status,
      'returned'::public.order_status
    )
    when 'completed' then p_to_status = 'returned'::public.order_status
    else false
  end;

  if not v_allowed then
    return jsonb_build_object(
      'success', false,
      'code', 'invalid_transition',
      'fromStatus', v_order.status,
      'toStatus', p_to_status
    );
  end if;

  if p_to_status = 'cancelled'::public.order_status
    and v_order.payment_status in (
      'paid'::public.order_payment_status,
      'refunded'::public.order_payment_status
    )
  then
    return jsonb_build_object(
      'success', false,
      'code', 'payment_state_blocks_cancellation'
    );
  end if;

  if p_to_status = 'awaiting_customization_review'::public.order_status
    and not exists (
      select 1
      from public.order_items oi
      where oi.order_id = p_order_id
        and jsonb_array_length(oi.customizations_snapshot) > 0
    )
  then
    return jsonb_build_object(
      'success', false,
      'code', 'customization_not_required'
    );
  end if;

  update public.orders
  set status = p_to_status
  where id = p_order_id;

  insert into public.order_status_history (
    order_id,
    from_status,
    to_status,
    actor_user_id,
    note,
    request_id
  ) values (
    p_order_id,
    v_order.status,
    p_to_status,
    auth.uid(),
    v_note,
    p_request_id
  ) returning id into v_history_id;

  return jsonb_build_object(
    'success', true,
    'idempotentReplay', false,
    'orderId', p_order_id,
    'fromStatus', v_order.status,
    'toStatus', p_to_status,
    'historyId', v_history_id
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
