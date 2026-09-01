-- Products without tracked inventory do not create stock reservations. Allow
-- their pending card payments to receive a Stripe Checkout Session while
-- continuing to reject any existing reservation that is not active/valid.
create or replace function public.attach_stripe_checkout_session(
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

  if exists (
    select 1 from public.stock_reservations sr
    where sr.order_id = v_order.id
      and (
        sr.status <> 'active'
        or sr.expires_at <= statement_timestamp()
      )
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
