begin;

do $$
declare
  v_admin_id uuid := '7c000000-0000-4000-8000-000000000001';
  v_customer_id uuid := '7c000000-0000-4000-8000-000000000002';
  v_shipping_id uuid := '7c000000-0000-4000-8000-000000000003';
  v_product_id uuid := '7c000000-0000-4000-8000-000000000004';
  v_inventory_id uuid := '7c000000-0000-4000-8000-000000000005';
  v_cod_order_id uuid := '7c000000-0000-4000-8000-000000000010';
  v_cancelled_order_id uuid := '7c000000-0000-4000-8000-000000000011';
  v_pending_card_id uuid := '7c000000-0000-4000-8000-000000000012';
  v_paid_card_id uuid := '7c000000-0000-4000-8000-000000000013';
  v_refunded_card_id uuid := '7c000000-0000-4000-8000-000000000014';
  v_shipped_order_id uuid := '7c000000-0000-4000-8000-000000000015';
  v_custom_order_id uuid := '7c000000-0000-4000-8000-000000000016';
  v_payment_id uuid := '7c000000-0000-4000-8000-000000000020';
  v_collection_request uuid := '7c000000-0000-4000-8000-000000000030';
  v_retry_request uuid := '7c000000-0000-4000-8000-000000000031';
  v_result jsonb;
  v_notification_id uuid;
  v_attempt_id uuid;
  v_order_status public.order_status;
begin
  assert to_regclass('public.notification_logs') is not null,
    'notification_logs table is missing';
  assert to_regclass('public.notification_attempts') is not null,
    'notification_attempts table is missing';
  assert to_regclass('public.cod_collections') is not null,
    'cod_collections table is missing';
  assert to_regclass('public.cod_collection_events') is not null,
    'cod collection audit is missing';
  assert to_regprocedure('public.collect_admin_cod_payment(uuid,uuid)') is not null,
    'COD collection RPC is missing';
  assert to_regprocedure('public.enqueue_order_notification(uuid,public.notification_type,text)') is not null,
    'notification enqueue RPC is missing';
  assert not has_table_privilege('anon', 'public.notification_logs', 'insert'),
    'anon can insert notification logs';
  assert not has_table_privilege('authenticated', 'public.notification_logs', 'update'),
    'browser can update notification logs';
  assert not has_table_privilege('authenticated', 'public.cod_collections', 'update'),
    'browser can update COD financial state directly';
  assert not has_function_privilege('anon',
    'public.collect_admin_cod_payment(uuid,uuid)', 'execute'),
    'anon can collect COD';

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (v_admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated',
      'authenticated', 'admin-7c@example.com', '', now(),
      '{"provider":"email","providers":["email"]}', '{}'::jsonb, now(), now()),
    (v_customer_id, '00000000-0000-4000-8000-000000000000', 'authenticated',
      'authenticated', 'customer-7c@example.com', '', now(),
      '{"provider":"email","providers":["email"]}', '{}'::jsonb, now(), now());
  insert into public.user_roles (user_id, role) values (v_admin_id, 'admin');

  insert into public.shipping_methods (id, code, name, price_minor)
  values (v_shipping_id, 'curier-7c-sql', 'Curier 7C SQL', 500);
  insert into public.products (
    id, name, slug, base_price, product_type, publication_status, availability_status
  ) values (
    v_product_id, 'Produs 7C SQL', 'produs-7c-sql', 10, 'standard', 'published', 'in_stock'
  );
  insert into public.inventory (
    id, product_id, quantity, low_stock_threshold
  ) values (v_inventory_id, v_product_id, 5, 3);

  insert into public.orders (
    id, idempotency_key, request_fingerprint, email, phone, customer_type,
    shipping_address, billing_address, shipping_method_id,
    shipping_method_code, shipping_method_name, payment_method,
    payment_status, status, subtotal_minor, shipping_minor, total_minor
  ) values
    (v_cod_order_id, '7c000000-0000-4000-8000-000000000040', '{}'::jsonb,
      'cod-7c@example.com', '0712345678', 'individual',
      '{"recipientName":"COD 7C","city":"Iași","county":"Iași"}'::jsonb,
      '{}'::jsonb, v_shipping_id, 'curier-7c-sql', 'Curier 7C SQL',
      'cash_on_delivery', 'unpaid', 'in_progress', 1000, 500, 1500),
    (v_cancelled_order_id, '7c000000-0000-4000-8000-000000000041', '{}'::jsonb,
      'cancelled-7c@example.com', '0712345678', 'individual', '{}'::jsonb,
      '{}'::jsonb, v_shipping_id, 'curier-7c-sql', 'Curier 7C SQL',
      'cash_on_delivery', 'unpaid', 'cancelled', 1000, 500, 1500),
    (v_pending_card_id, '7c000000-0000-4000-8000-000000000042', '{}'::jsonb,
      'pending-7c@example.com', '0712345678', 'individual', '{}'::jsonb,
      '{}'::jsonb, v_shipping_id, 'curier-7c-sql', 'Curier 7C SQL',
      'card', 'pending', 'awaiting_payment', 1000, 500, 1500),
    (v_paid_card_id, '7c000000-0000-4000-8000-000000000043', '{}'::jsonb,
      'paid-7c@example.com', '0712345678', 'individual', '{}'::jsonb,
      '{}'::jsonb, v_shipping_id, 'curier-7c-sql', 'Curier 7C SQL',
      'card', 'paid', 'in_progress', 1000, 500, 1500),
    (v_refunded_card_id, '7c000000-0000-4000-8000-000000000044', '{}'::jsonb,
      'refunded-7c@example.com', '0712345678', 'individual', '{}'::jsonb,
      '{}'::jsonb, v_shipping_id, 'curier-7c-sql', 'Curier 7C SQL',
      'card', 'refunded', 'refunded', 1000, 500, 1500),
    (v_shipped_order_id, '7c000000-0000-4000-8000-000000000045', '{}'::jsonb,
      'shipped-7c@example.com', '0712345678', 'individual', '{}'::jsonb,
      '{}'::jsonb, v_shipping_id, 'curier-7c-sql', 'Curier 7C SQL',
      'cash_on_delivery', 'unpaid', 'shipped', 1000, 500, 1500),
    (v_custom_order_id, '7c000000-0000-4000-8000-000000000046', '{}'::jsonb,
      'custom-7c@example.com', '0712345678', 'individual', '{}'::jsonb,
      '{}'::jsonb, v_shipping_id, 'curier-7c-sql', 'Curier 7C SQL',
      'cash_on_delivery', 'unpaid', 'awaiting_customization_review', 1000, 500, 1500);

  insert into public.order_status_history (order_id, from_status, to_status, note)
  values
    (v_cod_order_id, 'new', 'in_progress', 'Fixture 7C'),
    (v_cancelled_order_id, 'new', 'cancelled', 'Fixture 7C'),
    (v_paid_card_id, 'paid', 'in_progress', 'Fixture 7C'),
    (v_refunded_card_id, 'paid', 'refunded', 'Fixture 7C'),
    (v_shipped_order_id, 'ready', 'shipped', 'Fixture 7C'),
    (v_custom_order_id, 'new', 'awaiting_customization_review', 'Fixture 7C');
  insert into public.shipments (
    order_id, carrier, tracking_number, tracking_url, shipped_at
  ) values (
    v_shipped_order_id, 'Curier 7C', 'AWB-7C-001',
    'https://tracking.example.com/AWB-7C-001', now()
  );
  insert into public.payments (
    id, order_id, provider, status, amount_minor, currency,
    idempotency_key, pending_expires_at
  ) values (
    v_payment_id, v_pending_card_id, 'internal', 'pending', 1500, 'RON',
    '7c000000-0000-4000-8000-000000000050', now() + interval '1 hour'
  );
  insert into public.stock_reservations (
    order_id, payment_id, inventory_id, quantity, request_idempotency_key, expires_at
  ) values (
    v_pending_card_id, v_payment_id, v_inventory_id, 3,
    '7c000000-0000-4000-8000-000000000050', now() + interval '1 hour'
  );

  assert (select count(*) = 4 from public.cod_collections
    where order_id in (v_cod_order_id, v_cancelled_order_id, v_shipped_order_id, v_custom_order_id)
      and status = 'unpaid'), 'COD trigger did not create unpaid financial rows';

  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_customer_id::text, true);
  v_result := public.collect_admin_cod_payment(v_cod_order_id, v_collection_request);
  assert not (v_result->>'success')::boolean and v_result->>'code' = 'unauthorized',
    'non-admin collected COD';

  perform set_config('request.jwt.claim.sub', v_admin_id::text, true);
  select status into v_order_status from public.orders where id = v_cod_order_id;
  v_result := public.collect_admin_cod_payment(v_cod_order_id, v_collection_request);
  assert (v_result->>'success')::boolean and not (v_result->>'idempotentReplay')::boolean,
    'valid COD collection failed';
  assert (select status = 'collected' and expected_amount_minor = 1500
    and collected_by = v_admin_id from public.cod_collections
    where order_id = v_cod_order_id), 'COD collection record is invalid';
  assert (select payment_status = 'paid' and status = v_order_status
    from public.orders where id = v_cod_order_id),
    'COD collection changed operational status or missed financial status';
  assert (select count(*) = 1 from public.cod_collection_events
    where order_id = v_cod_order_id and request_id = v_collection_request),
    'COD audit event is missing';
  v_result := public.collect_admin_cod_payment(v_cod_order_id, v_collection_request);
  assert (v_result->>'success')::boolean and (v_result->>'idempotentReplay')::boolean,
    'COD collection retry was not idempotent';
  assert (select count(*) = 1 from public.cod_collection_events
    where order_id = v_cod_order_id), 'COD retry duplicated audit';
  v_result := public.cancel_admin_order(v_cod_order_id, gen_random_uuid(), null);
  assert not (v_result->>'success')::boolean and v_result->>'code' = 'refund_required',
    'collected COD used simple cancellation';
  v_result := public.collect_admin_cod_payment(v_cancelled_order_id, gen_random_uuid());
  assert not (v_result->>'success')::boolean
    and v_result->>'code' = 'order_not_collectible',
    'cancelled unpaid COD was collected';

  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform set_config('request.jwt.claim.sub', '', true);
  v_result := public.enqueue_order_notification(
    v_pending_card_id, 'payment_confirmation', 'stripe_webhook'
  );
  assert not (v_result->>'success')::boolean
    and v_result->>'code' = 'notification_not_eligible',
    'pending Stripe order queued payment confirmation';

  v_result := public.enqueue_order_notification(
    v_paid_card_id, 'order_confirmation', 'stripe_webhook'
  );
  assert (v_result->>'success')::boolean, 'paid Stripe order confirmation was rejected';
  v_notification_id := (v_result->>'notificationId')::uuid;
  v_result := public.enqueue_order_notification(
    v_paid_card_id, 'order_confirmation', 'stripe_webhook'
  );
  assert (v_result->>'notificationId')::uuid = v_notification_id,
    'same Stripe event produced another notification';
  assert (select count(*) = 1 from public.notification_logs
    where order_id = v_paid_card_id and notification_type = 'order_confirmation'),
    'DB notification dedupe failed';

  v_result := public.claim_notification_delivery(
    v_notification_id, v_notification_id, null
  );
  assert (v_result->>'success')::boolean and (v_result->>'claimed')::boolean,
    'automatic notification attempt was not claimed';
  v_attempt_id := (v_result->>'attemptId')::uuid;
  v_result := public.finish_notification_delivery(
    v_attempt_id, false, null, 'provider_temporarily_unavailable'
  );
  assert (v_result->>'success')::boolean, 'provider failure was not recorded';
  assert (select status = 'in_progress' from public.orders where id = v_paid_card_id),
    'email failure rolled back business state';
  assert (select status = 'failed' and attempt_count = 1
    from public.notification_logs where id = v_notification_id),
    'failed notification state is invalid';

  v_result := public.claim_notification_delivery(
    v_notification_id, gen_random_uuid(), v_customer_id
  );
  assert not (v_result->>'success')::boolean and v_result->>'code' = 'admin_required',
    'non-admin actor claimed manual retry';
  v_result := public.claim_notification_delivery(
    v_notification_id, v_retry_request, v_admin_id
  );
  assert (v_result->>'success')::boolean and (v_result->>'claimed')::boolean,
    'admin manual retry was not claimed';
  v_attempt_id := (v_result->>'attemptId')::uuid;
  v_result := public.finish_notification_delivery(
    v_attempt_id, true, 'email_7c_test_message', null
  );
  assert (v_result->>'success')::boolean, 'successful retry was not recorded';
  assert (select status = 'sent' and attempt_count = 2
    and manual_resend_actor_id = v_admin_id from public.notification_logs
    where id = v_notification_id), 'manual retry audit is invalid';
  v_result := public.claim_notification_delivery(
    v_notification_id, v_retry_request, v_admin_id
  );
  assert (v_result->>'success')::boolean and (v_result->>'idempotentReplay')::boolean,
    'manual retry request replay was not idempotent';
  assert (select count(*) = 2 from public.notification_attempts
    where notification_id = v_notification_id), 'retry replay duplicated attempt';

  v_result := public.enqueue_order_notification(
    v_shipped_order_id, 'shipped', 'admin_shipment'
  );
  assert (v_result->>'success')::boolean, 'legitimate shipment notification failed';
  v_result := public.enqueue_order_notification(
    v_refunded_card_id, 'refunded', 'stripe_refund_webhook'
  );
  assert (v_result->>'success')::boolean, 'refunded notification failed';
  v_result := public.enqueue_order_notification(
    v_custom_order_id, 'awaiting_customization_review', 'admin_status'
  );
  assert (v_result->>'success')::boolean, 'customization notification failed';
  assert (select count(*) = 1 from public.orders where status = 'awaiting_customization_review'
    and id = v_custom_order_id), 'dashboard customization fixture is missing';
  assert (select quantity - coalesce((select sum(sr.quantity) from public.stock_reservations sr
    where sr.inventory_id = v_inventory_id and sr.status = 'active'
      and sr.expires_at > statement_timestamp()), 0) <= low_stock_threshold
    from public.inventory where id = v_inventory_id),
    'dashboard effective low stock calculation is wrong';

  raise notice '7C SQL: 30 PASS / 0 FAILED';
end;
$$;

rollback;
