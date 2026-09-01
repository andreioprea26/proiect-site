begin;

do $$
declare
  v_admin_id uuid := '7b000000-0000-4000-8000-000000000001';
  v_customer_id uuid := '7b000000-0000-4000-8000-000000000002';
  v_shipping_id uuid := '7b000000-0000-4000-8000-000000000003';
  v_product_id uuid := '7b000000-0000-4000-8000-000000000004';
  v_inventory_id uuid := '7b000000-0000-4000-8000-000000000005';
  v_ship_order_id uuid := '7b000000-0000-4000-8000-000000000010';
  v_cod_order_id uuid := '7b000000-0000-4000-8000-000000000011';
  v_shipped_order_id uuid := '7b000000-0000-4000-8000-000000000012';
  v_paid_order_id uuid := '7b000000-0000-4000-8000-000000000013';
  v_pending_order_id uuid := '7b000000-0000-4000-8000-000000000014';
  v_refunded_order_id uuid := '7b000000-0000-4000-8000-000000000015';
  v_paid_payment_id uuid := '7b000000-0000-4000-8000-000000000020';
  v_pending_payment_id uuid := '7b000000-0000-4000-8000-000000000021';
  v_configure_request uuid := '7b000000-0000-4000-8000-000000000030';
  v_update_request uuid := '7b000000-0000-4000-8000-000000000031';
  v_ship_request uuid := '7b000000-0000-4000-8000-000000000032';
  v_cancel_request uuid := '7b000000-0000-4000-8000-000000000033';
  v_pending_cancel_request uuid := '7b000000-0000-4000-8000-000000000034';
  v_result jsonb;
  v_refund_a jsonb;
  v_refund_b jsonb;
begin
  assert to_regclass('public.shipments') is not null, 'shipments table is missing';
  assert to_regclass('public.shipment_events') is not null, 'shipment events table is missing';
  assert to_regprocedure('public.configure_admin_shipment(uuid,text,text,text,uuid)') is not null,
    'configure shipment RPC is missing';
  assert to_regprocedure('public.mark_admin_order_shipped(uuid,uuid,text)') is not null,
    'mark shipped RPC is missing';
  assert to_regprocedure('public.cancel_admin_order(uuid,uuid,text)') is not null,
    'cancel order RPC is missing';
  assert not has_table_privilege('authenticated', 'public.shipments', 'insert'),
    'browser can insert shipments directly';
  assert not has_table_privilege('authenticated', 'public.shipment_events', 'insert'),
    'browser can insert shipment audit directly';
  assert not has_function_privilege('anon',
    'public.cancel_admin_order(uuid,uuid,text)', 'execute'),
    'anonymous browser can cancel orders';
  assert not has_function_privilege('authenticated',
    'public.transition_admin_order_status_7a_internal(uuid,public.order_status,uuid,text)',
    'execute'), 'browser can bypass specialized fulfillment operations';

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (v_admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated',
      'authenticated', 'admin-7b@example.com', '', now(),
      '{"provider":"email","providers":["email"]}', '{}'::jsonb, now(), now()),
    (v_customer_id, '00000000-0000-0000-0000-000000000000', 'authenticated',
      'authenticated', 'customer-7b@example.com', '', now(),
      '{"provider":"email","providers":["email"]}', '{}'::jsonb, now(), now());
  insert into public.user_roles (user_id, role) values (v_admin_id, 'admin');

  insert into public.shipping_methods (id, code, name, price_minor)
  values (v_shipping_id, 'curier-7b-sql', 'Curier 7B SQL', 500);
  insert into public.products (
    id, name, slug, base_price, product_type, publication_status,
    availability_status
  ) values (
    v_product_id, 'Produs 7B SQL', 'produs-7b-sql', 10, 'standard',
    'published', 'in_stock'
  );
  insert into public.inventory (id, product_id, quantity)
  values (v_inventory_id, v_product_id, 3);

  insert into public.orders (
    id, idempotency_key, request_fingerprint, email, phone, customer_type,
    shipping_address, billing_address, shipping_method_id,
    shipping_method_code, shipping_method_name, payment_method,
    payment_status, status, subtotal_minor, shipping_minor, total_minor
  ) values
    (v_ship_order_id, '7b000000-0000-4000-8000-000000000040', '{}'::jsonb,
      'ship-7b@example.com', '0712345678', 'individual', '{}'::jsonb, '{}'::jsonb,
      v_shipping_id, 'curier-7b-sql', 'Curier 7B SQL', 'cash_on_delivery',
      'unpaid', 'ready', 1000, 500, 1500),
    (v_cod_order_id, '7b000000-0000-4000-8000-000000000041', '{}'::jsonb,
      'cod-7b@example.com', '0712345678', 'individual', '{}'::jsonb, '{}'::jsonb,
      v_shipping_id, 'curier-7b-sql', 'Curier 7B SQL', 'cash_on_delivery',
      'unpaid', 'in_progress', 1000, 500, 1500),
    (v_shipped_order_id, '7b000000-0000-4000-8000-000000000042', '{}'::jsonb,
      'shipped-7b@example.com', '0712345678', 'individual', '{}'::jsonb, '{}'::jsonb,
      v_shipping_id, 'curier-7b-sql', 'Curier 7B SQL', 'cash_on_delivery',
      'unpaid', 'shipped', 1000, 500, 1500),
    (v_paid_order_id, '7b000000-0000-4000-8000-000000000043', '{}'::jsonb,
      'paid-7b@example.com', '0712345678', 'individual', '{}'::jsonb, '{}'::jsonb,
      v_shipping_id, 'curier-7b-sql', 'Curier 7B SQL', 'card',
      'paid', 'paid', 1000, 500, 1500),
    (v_pending_order_id, '7b000000-0000-4000-8000-000000000044', '{}'::jsonb,
      'pending-7b@example.com', '0712345678', 'individual', '{}'::jsonb, '{}'::jsonb,
      v_shipping_id, 'curier-7b-sql', 'Curier 7B SQL', 'card',
      'pending', 'awaiting_payment', 1000, 500, 1500),
    (v_refunded_order_id, '7b000000-0000-4000-8000-000000000045', '{}'::jsonb,
      'refunded-7b@example.com', '0712345678', 'individual', '{}'::jsonb, '{}'::jsonb,
      v_shipping_id, 'curier-7b-sql', 'Curier 7B SQL', 'card',
      'refunded', 'refunded', 1000, 500, 1500);

  insert into public.inventory_movements (
    inventory_id, quantity_delta, quantity_before, quantity_after, reason, context
  ) values (
    v_inventory_id, -2, 5, 3, 'Plasare comandă ramburs',
    jsonb_build_object('source', 'place_cod_order', 'orderId', v_cod_order_id)
  );

  insert into public.payments (
    id, order_id, provider, status, amount_minor, currency, idempotency_key,
    pending_expires_at, provider_payment_id, provider_checkout_session_id, paid_at
  ) values
    (v_paid_payment_id, v_paid_order_id, 'stripe', 'paid', 1500, 'RON',
      '7b000000-0000-4000-8000-000000000050', now() + interval '1 hour',
      'pi_7b_paid_sql', 'cs_test_7b_paid_sql', now()),
    (v_pending_payment_id, v_pending_order_id, 'stripe', 'pending', 1500, 'RON',
      '7b000000-0000-4000-8000-000000000051', now() + interval '1 hour',
      null, 'cs_test_7b_pending_sql', null);
  insert into public.stock_reservations (
    order_id, payment_id, inventory_id, quantity, request_idempotency_key,
    expires_at
  ) values (
    v_pending_order_id, v_pending_payment_id, v_inventory_id, 1,
    '7b000000-0000-4000-8000-000000000052', now() + interval '1 hour'
  );

  perform set_config('request.jwt.claim.sub', v_customer_id::text, true);
  v_result := public.configure_admin_shipment(
    v_ship_order_id, 'Curier', 'AWB-7B', 'https://tracking.example.com/AWB-7B',
    gen_random_uuid()
  );
  assert not (v_result->>'success')::boolean and v_result->>'code' = 'unauthorized',
    'non-admin configured shipment';
  v_result := public.cancel_admin_order(v_cod_order_id, gen_random_uuid(), null);
  assert not (v_result->>'success')::boolean and v_result->>'code' = 'unauthorized',
    'non-admin cancelled order';

  perform set_config('request.jwt.claim.sub', v_admin_id::text, true);
  v_result := public.configure_admin_shipment(
    v_ship_order_id, 'Curier SQL', 'AWB-7B-001',
    'https://tracking.example.com/AWB-7B-001', v_configure_request
  );
  assert (v_result->>'success')::boolean and not (v_result->>'idempotentReplay')::boolean,
    'shipment create failed';
  assert (select count(*) = 1 from public.shipments where order_id = v_ship_order_id),
    'shipment create produced the wrong row count';

  v_result := public.configure_admin_shipment(
    v_ship_order_id, 'Curier SQL Corectat', 'AWB-7B-002',
    'https://tracking.example.com/AWB-7B-002', v_update_request
  );
  assert (v_result->>'success')::boolean, 'shipment update failed';
  assert (select carrier = 'Curier SQL Corectat' and tracking_number = 'AWB-7B-002'
    from public.shipments where order_id = v_ship_order_id),
    'shipment update did not persist';
  assert (select count(*) = 2 from public.shipment_events
    where order_id = v_ship_order_id and action in ('created', 'updated')),
    'shipment audit did not record create and update';

  v_result := public.configure_admin_shipment(
    v_ship_order_id, 'Curier', 'AWB', 'http://unsafe.example.com', gen_random_uuid()
  );
  assert not (v_result->>'success')::boolean and v_result->>'code' = 'invalid_shipment',
    'non-HTTPS tracking URL was accepted';

  v_result := public.mark_admin_order_shipped(
    v_ship_order_id, v_ship_request, 'Predată curierului.'
  );
  assert (v_result->>'success')::boolean, 'valid mark shipped failed';
  assert (select status = 'shipped' from public.orders where id = v_ship_order_id),
    'mark shipped did not update order';
  assert (select shipped_at is not null from public.shipments where order_id = v_ship_order_id),
    'mark shipped did not set shipped_at';
  assert (select count(*) = 1 from public.order_status_history
    where order_id = v_ship_order_id and request_id = v_ship_request
      and to_status = 'shipped'), 'shipped history is not unique';
  v_result := public.mark_admin_order_shipped(
    v_ship_order_id, v_ship_request, 'Predată curierului.'
  );
  assert (v_result->>'success')::boolean and (v_result->>'idempotentReplay')::boolean,
    'mark shipped retry was not idempotent';
  assert (select count(*) = 1 from public.shipment_events
    where order_id = v_ship_order_id and action = 'shipped'),
    'mark shipped retry duplicated audit';

  v_result := public.mark_admin_order_shipped(
    v_cod_order_id, gen_random_uuid(), null
  );
  assert not (v_result->>'success')::boolean and v_result->>'code' = 'invalid_ship_status',
    'invalid mark shipped status succeeded';
  v_result := public.transition_admin_order_status(
    v_cod_order_id, 'shipped', gen_random_uuid(), null
  );
  assert not (v_result->>'success')::boolean
    and v_result->>'code' = 'specialized_shipment_required',
    'generic transition bypassed shipment operation';

  v_result := public.cancel_admin_order(
    v_cod_order_id, v_cancel_request, 'Clientul a solicitat anularea.'
  );
  assert (v_result->>'success')::boolean and (v_result->>'restockedQuantity')::integer = 2,
    'COD cancellation failed or restored the wrong quantity';
  assert (select quantity = 5 from public.inventory where id = v_inventory_id),
    'COD cancellation did not restore inventory';
  assert (select count(*) = 1 from public.inventory_movements
    where context->>'source' = 'admin_cod_cancellation'
      and context->>'orderId' = v_cod_order_id::text),
    'COD cancellation did not create exactly one reversal movement';
  assert (select actor_user_id = v_admin_id from public.order_status_history
    where request_id = v_cancel_request), 'COD cancellation history actor is missing';
  v_result := public.cancel_admin_order(
    v_cod_order_id, v_cancel_request, 'Clientul a solicitat anularea.'
  );
  assert (v_result->>'success')::boolean and (v_result->>'idempotentReplay')::boolean,
    'COD cancellation retry was not idempotent';
  assert (select quantity = 5 from public.inventory where id = v_inventory_id),
    'COD cancellation retry duplicated restock';

  v_result := public.cancel_admin_order(v_shipped_order_id, gen_random_uuid(), null);
  assert not (v_result->>'success')::boolean and v_result->>'code' = 'invalid_cancel_status',
    'shipped COD order was cancelled';
  v_result := public.cancel_admin_order(v_paid_order_id, gen_random_uuid(), null);
  assert not (v_result->>'success')::boolean and v_result->>'code' = 'refund_required',
    'paid Stripe order was cancelled directly';

  v_result := public.cancel_admin_order(v_pending_order_id, gen_random_uuid(), null);
  assert not (v_result->>'success')::boolean
    and v_result->>'code' = 'stripe_expiration_required',
    'pending Stripe cancellation bypassed Session expiration';
  assert (select status = 'active' from public.stock_reservations
    where payment_id = v_pending_payment_id),
    'pending Stripe cancellation released reservation prematurely';

  v_result := public.reconcile_admin_stripe_cancellation(
    v_pending_payment_id, 'cs_test_7b_pending_sql', 'expired', 'unpaid', null,
    1500, 'ron', 'payment', v_admin_id, v_pending_cancel_request,
    'Anulare Stripe confirmată.'
  );
  assert (v_result->>'success')::boolean, 'expired Stripe reconciliation failed';
  assert (select status = 'expired' from public.stock_reservations
    where payment_id = v_pending_payment_id),
    'expired Stripe reconciliation did not release reservation';
  assert (select status = 'cancelled' from public.orders
    where id = v_pending_order_id), 'expired Stripe order was not cancelled';
  assert (select actor_user_id = v_admin_id from public.order_status_history
    where request_id = v_pending_cancel_request),
    'Stripe cancellation history was not attributed to admin';

  v_refund_a := public.prepare_full_stripe_refund(
    v_paid_payment_id, 'Refund admin 7B', v_admin_id
  );
  v_refund_b := public.prepare_full_stripe_refund(
    v_paid_payment_id, 'Refund admin 7B', v_admin_id
  );
  assert (v_refund_a->>'success')::boolean, 'eligible admin refund was rejected';
  assert (v_refund_b->>'success')::boolean
    and (v_refund_b->>'idempotentReplay')::boolean,
    'duplicate full refund initiation was not idempotent';
  assert (v_refund_a->>'refundId') = (v_refund_b->>'refundId'),
    'duplicate full refund created different records';
  assert (select count(*) = 1 from public.payment_refunds
    where payment_id = v_paid_payment_id and metadata->>'kind' = 'full'),
    'duplicate full refund created multiple records';
  assert (select quantity = 5 from public.inventory where id = v_inventory_id),
    'refund initiation changed inventory';

  v_result := public.transition_admin_order_status(
    v_refunded_order_id, 'paid', gen_random_uuid(), null
  );
  assert not (v_result->>'success')::boolean, 'refunded order returned to paid';
  v_result := public.cancel_admin_order(v_refunded_order_id, gen_random_uuid(), null);
  assert not (v_result->>'success')::boolean, 'refunded order was cancelled';
end;
$$;

rollback;
