begin;

do $$
declare
  v_admin_id uuid := '7a000000-0000-4000-8000-000000000001';
  v_customer_id uuid := '7a000000-0000-4000-8000-000000000002';
  v_shipping_id uuid := '7a000000-0000-4000-8000-000000000003';
  v_cod_order_id uuid := '7a000000-0000-4000-8000-000000000010';
  v_card_order_id uuid := '7a000000-0000-4000-8000-000000000011';
  v_refunded_order_id uuid := '7a000000-0000-4000-8000-000000000012';
  v_request_id uuid := '7a000000-0000-4000-8000-000000000020';
  v_result jsonb;
begin
  assert to_regprocedure(
    'public.transition_admin_order_status(uuid,public.order_status,uuid,text)'
  ) is not null, 'admin order transition RPC is missing';
  assert exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'order_status_history'
      and column_name = 'request_id'
  ), 'history request_id is missing';
  assert not has_table_privilege('authenticated', 'public.orders', 'update'),
    'authenticated browser can update orders directly';
  assert not has_table_privilege(
    'authenticated', 'public.order_status_history', 'insert'
  ), 'authenticated browser can insert arbitrary history';
  assert not has_function_privilege(
    'anon',
    'public.transition_admin_order_status(uuid,public.order_status,uuid,text)',
    'execute'
  ), 'anonymous browser can call admin transition RPC';
  assert has_function_privilege(
    'authenticated',
    'public.transition_admin_order_status(uuid,public.order_status,uuid,text)',
    'execute'
  ), 'authenticated admin cannot call transition RPC';

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values
    (v_admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated',
      'authenticated', 'admin-7a@example.com', '', now(),
      '{"provider":"email","providers":["email"]}', '{}'::jsonb,
      now(), now()),
    (v_customer_id, '00000000-0000-0000-0000-000000000000', 'authenticated',
      'authenticated', 'customer-7a@example.com', '', now(),
      '{"provider":"email","providers":["email"]}', '{}'::jsonb,
      now(), now());
  -- The Auth bootstrap trigger already grants customer to both temporary
  -- users. Add only the elevated role required by this fixture.
  insert into public.user_roles (user_id, role)
  values (v_admin_id, 'admin');

  insert into public.shipping_methods (id, code, name, price_minor)
  values (v_shipping_id, 'admin-orders-sql', 'Curier 7A SQL', 500);

  insert into public.orders (
    id, idempotency_key, request_fingerprint, email, phone, customer_type,
    shipping_address, billing_address, shipping_method_id,
    shipping_method_code, shipping_method_name, payment_method,
    payment_status, status, subtotal_minor, shipping_minor, total_minor
  ) values
    (v_cod_order_id, '7a000000-0000-4000-8000-000000000030', '{}'::jsonb,
      'cod-7a@example.com', '0712345678', 'individual',
      '{"recipientName":"COD 7A"}'::jsonb,
      '{"recipientName":"COD 7A"}'::jsonb, v_shipping_id,
      'admin-orders-sql', 'Curier 7A SQL', 'cash_on_delivery', 'unpaid',
      'new', 1000, 500, 1500),
    (v_card_order_id, '7a000000-0000-4000-8000-000000000031', '{}'::jsonb,
      'card-7a@example.com', '0712345678', 'individual',
      '{"recipientName":"Card 7A"}'::jsonb,
      '{"recipientName":"Card 7A"}'::jsonb, v_shipping_id,
      'admin-orders-sql', 'Curier 7A SQL', 'card', 'paid',
      'paid', 1000, 500, 1500),
    (v_refunded_order_id, '7a000000-0000-4000-8000-000000000032', '{}'::jsonb,
      'refund-7a@example.com', '0712345678', 'individual',
      '{"recipientName":"Refund 7A"}'::jsonb,
      '{"recipientName":"Refund 7A"}'::jsonb, v_shipping_id,
      'admin-orders-sql', 'Curier 7A SQL', 'card', 'refunded',
      'refunded', 1000, 500, 1500);

  insert into public.payments (
    order_id, provider, status, amount_minor, currency, idempotency_key,
    pending_expires_at, provider_payment_id, paid_at
  ) values (
    v_card_order_id, 'stripe', 'paid', 1500, 'RON',
    '7a000000-0000-4000-8000-000000000031', now() + interval '1 hour',
    'pi_admin_orders_sql', now()
  );

  perform set_config('request.jwt.claim.sub', v_customer_id::text, true);
  v_result := public.transition_admin_order_status(
    v_cod_order_id, 'in_progress', gen_random_uuid(), null
  );
  assert not (v_result->>'success')::boolean
    and v_result->>'code' = 'unauthorized',
    'customer changed an order status';

  perform set_config('request.jwt.claim.sub', v_admin_id::text, true);
  v_result := public.transition_admin_order_status(
    v_cod_order_id, 'in_progress', v_request_id, 'Preluată de atelier.'
  );
  assert (v_result->>'success')::boolean
    and not (v_result->>'idempotentReplay')::boolean,
    'valid admin transition failed';
  assert (select status = 'in_progress' from public.orders where id = v_cod_order_id),
    'valid transition did not update the order';
  assert (select count(*) = 1 from public.order_status_history
    where order_id = v_cod_order_id and request_id = v_request_id),
    'valid transition did not create exactly one history row';
  assert (select actor_user_id = v_admin_id from public.order_status_history
    where request_id = v_request_id), 'history actor is not the admin';

  v_result := public.transition_admin_order_status(
    v_cod_order_id, 'in_progress', v_request_id, 'Preluată de atelier.'
  );
  assert (v_result->>'success')::boolean
    and (v_result->>'idempotentReplay')::boolean,
    'same request was not idempotent';
  assert (select count(*) = 1 from public.order_status_history
    where request_id = v_request_id), 'retry duplicated history';

  v_result := public.transition_admin_order_status(
    v_cod_order_id, 'in_progress', v_request_id, 'Notă diferită'
  );
  assert not (v_result->>'success')::boolean
    and v_result->>'code' = 'idempotency_conflict',
    'same request ID accepted a different payload';

  v_result := public.transition_admin_order_status(
    v_cod_order_id, 'completed', gen_random_uuid(), null
  );
  assert not (v_result->>'success')::boolean
    and v_result->>'code' = 'invalid_transition',
    'invalid in_progress to completed transition succeeded';

  v_result := public.transition_admin_order_status(
    v_refunded_order_id, 'paid', gen_random_uuid(), null
  );
  assert not (v_result->>'success')::boolean
    and v_result->>'code' = 'invalid_transition',
    'refunded order returned to paid';

  v_result := public.transition_admin_order_status(
    v_card_order_id, 'in_progress', gen_random_uuid(), null
  );
  assert (v_result->>'success')::boolean, 'paid card order did not enter processing';
  assert (select status = 'paid' from public.payments where order_id = v_card_order_id),
    'operational transition changed Stripe payment status';
  assert (select payment_status = 'paid' from public.orders where id = v_card_order_id),
    'operational transition changed order payment status';
end;
$$;

rollback;
