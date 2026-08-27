begin;

do $$
declare
  v_product_id uuid := '59000000-0000-4000-8000-000000000001';
  v_expiring_product_id uuid := '59000000-0000-4000-8000-000000000002';
  v_shipping_id uuid := '59000000-0000-4000-8000-000000000003';
  v_paid_key uuid := '59000000-0000-4000-8000-000000000010';
  v_expiring_key uuid := '59000000-0000-4000-8000-000000000011';
  v_checkout jsonb;
  v_result jsonb;
  v_order_id uuid;
  v_payment_id uuid;
  v_expiring_order_id uuid;
  v_expiring_payment_id uuid;
  v_inventory_id uuid;
  v_expiring_inventory_id uuid;
  v_session_expires_at timestamptz := statement_timestamp() + interval '30 minutes';
begin
  assert public.stock_reservation_ttl() = interval '35 minutes',
    '6B reservation TTL must be 35 minutes';
  assert public.stripe_reservation_expiry_margin() = interval '5 minutes',
    'Stripe reservation margin must be 5 minutes';
  assert to_regclass('public.stripe_webhook_events') is not null,
    'stripe_webhook_events is missing';
  assert (select relrowsecurity from pg_class
    where oid = 'public.stripe_webhook_events'::regclass),
    'stripe_webhook_events RLS must be enabled';
  assert not has_table_privilege('anon', 'public.stripe_webhook_events', 'insert'),
    'anon can insert Stripe event ids';
  assert not has_table_privilege('authenticated', 'public.stripe_webhook_events', 'insert'),
    'authenticated can insert Stripe event ids';
  assert not has_function_privilege(
    'anon', 'public.prepare_card_order(uuid,jsonb,jsonb)', 'execute'
  ), 'anon can prepare card orders directly';
  assert not has_function_privilege(
    'authenticated', 'public.prepare_card_order(uuid,jsonb,jsonb)', 'execute'
  ), 'authenticated can prepare card orders directly';
  assert has_function_privilege(
    'service_role',
    'public.prepare_card_order_server(uuid,jsonb,jsonb,uuid)',
    'execute'
  ), 'server cannot prepare card orders';
  assert not has_function_privilege(
    'anon',
    'public.attach_stripe_checkout_session(uuid,text,timestamptz)',
    'execute'
  ), 'anon can attach Stripe Sessions';
  assert not has_function_privilege(
    'authenticated',
    'public.process_stripe_checkout_event(text,text,text,text,uuid,uuid,bigint,text,text,text)',
    'execute'
  ), 'authenticated can process Stripe events';

  insert into public.products (
    id, name, slug, base_price, product_type, publication_status,
    availability_status, is_customizable
  ) values
    (v_product_id, 'Produs Stripe SQL', 'produs-stripe-sql', 20.00,
      'standard', 'published', 'in_stock', false),
    (v_expiring_product_id, 'Produs Stripe expirat SQL',
      'produs-stripe-expirat-sql', 30.00,
      'standard', 'published', 'in_stock', false);

  insert into public.inventory (product_id, quantity)
  values (v_product_id, 3), (v_expiring_product_id, 1);

  select id into v_inventory_id from public.inventory
  where product_id = v_product_id;
  select id into v_expiring_inventory_id from public.inventory
  where product_id = v_expiring_product_id;

  insert into public.shipping_methods (id, code, name, price_minor)
  values (v_shipping_id, 'stripe-webhook-sql', 'Curier Stripe SQL', 750);

  v_checkout := jsonb_build_object(
    'email', 'stripe-webhook@example.com',
    'phone', '0712345678',
    'customerType', 'individual',
    'companyName', '',
    'companyTaxId', '',
    'companyRegistrationNumber', '',
    'shippingAddress', jsonb_build_object(
      'recipientName', 'Ana Stripe',
      'phone', '0712345678',
      'addressLine1', 'Strada Stripe 1',
      'addressLine2', '',
      'city', 'București',
      'county', 'București',
      'postalCode', '010101',
      'countryCode', 'RO'
    ),
    'billingSameAsShipping', true,
    'billingAddress', '{}'::jsonb,
    'shippingMethodId', v_shipping_id,
    'paymentMethod', 'card'
  );

  v_result := public.prepare_card_order_server(
    v_paid_key,
    jsonb_build_array(jsonb_build_object(
      'key', 'stripe-paid',
      'productId', v_product_id,
      'variantId', null,
      'quantity', 1,
      'customizations', '[]'::jsonb
    )),
    v_checkout,
    null
  );
  assert (v_result->>'success')::boolean,
    'server card preparation failed';
  v_order_id := (v_result->>'orderId')::uuid;
  v_payment_id := (v_result->>'paymentId')::uuid;

  v_result := public.attach_stripe_checkout_session(
    v_payment_id,
    'cs_test_sql_paid',
    v_session_expires_at
  );
  assert (v_result->>'success')::boolean,
    'Stripe Session was not attached';
  assert (select provider = 'stripe'
    and provider_checkout_session_id = 'cs_test_sql_paid'
    and pending_expires_at >= v_session_expires_at + interval '5 minutes'
    from public.payments where id = v_payment_id),
    'payment/session TTL alignment is incorrect';
  assert (select bool_and(expires_at >= v_session_expires_at + interval '5 minutes')
    from public.stock_reservations where order_id = v_order_id),
    'reservation can expire before Stripe Session plus margin';

  v_result := public.process_stripe_checkout_event(
    'evt_sql_completed',
    'checkout.session.completed',
    'cs_test_sql_paid',
    'pi_test_sql_paid',
    v_payment_id,
    v_order_id,
    2750,
    'ron',
    'paid',
    'payment'
  );
  assert (v_result->>'success')::boolean,
    'completed event was not processed';
  assert (select status = 'paid' and provider_payment_id = 'pi_test_sql_paid'
    from public.payments where id = v_payment_id),
    'completed event did not mark payment paid';
  assert (select status = 'paid' and payment_status = 'paid'
    from public.orders where id = v_order_id),
    'completed event did not mark order paid';
  assert (select bool_and(status = 'consumed')
    from public.stock_reservations where order_id = v_order_id),
    'completed event did not consume reservations';
  assert (select quantity = 2 from public.inventory where id = v_inventory_id),
    'completed event did not decrement inventory exactly once';
  assert (select count(*) = 1 from public.inventory_movements
    where context->>'paymentId' = v_payment_id::text),
    'completed event did not create exactly one inventory movement';
  assert (select count(*) = 1 from public.stripe_webhook_events
    where event_id = 'evt_sql_completed'),
    'completed event id was not recorded';

  v_result := public.process_stripe_checkout_event(
    'evt_sql_completed',
    'checkout.session.completed',
    'cs_test_sql_paid',
    'pi_test_sql_paid',
    v_payment_id,
    v_order_id,
    2750,
    'ron',
    'paid',
    'payment'
  );
  assert (v_result->>'idempotentReplay')::boolean,
    'duplicate Stripe event did not replay idempotently';
  assert (select quantity = 2 from public.inventory where id = v_inventory_id),
    'duplicate completed event decremented inventory twice';
  assert (select count(*) = 1 from public.inventory_movements
    where context->>'paymentId' = v_payment_id::text),
    'duplicate completed event duplicated movement';

  v_result := public.process_stripe_checkout_event(
    'evt_sql_expired_after_paid',
    'checkout.session.expired',
    'cs_test_sql_paid',
    'pi_test_sql_paid',
    v_payment_id,
    v_order_id,
    2750,
    'ron',
    'unpaid',
    'payment'
  );
  assert (v_result->>'success')::boolean,
    'expired-after-paid event was not safely acknowledged';
  assert (select status = 'paid' from public.payments where id = v_payment_id),
    'expired-after-paid changed payment state';
  assert (select quantity = 2 from public.inventory where id = v_inventory_id),
    'expired-after-paid restored or consumed inventory';

  v_result := public.prepare_card_order_server(
    v_expiring_key,
    jsonb_build_array(jsonb_build_object(
      'key', 'stripe-expiring',
      'productId', v_expiring_product_id,
      'variantId', null,
      'quantity', 1,
      'customizations', '[]'::jsonb
    )),
    v_checkout,
    null
  );
  assert (v_result->>'success')::boolean,
    'expiring card preparation failed';
  v_expiring_order_id := (v_result->>'orderId')::uuid;
  v_expiring_payment_id := (v_result->>'paymentId')::uuid;
  perform public.attach_stripe_checkout_session(
    v_expiring_payment_id,
    'cs_test_sql_expiring',
    v_session_expires_at
  );
  assert (public.get_order_confirmation(
    (select confirmation_token from public.orders
      where id = v_expiring_order_id)
  )->>'paymentStatus') = 'pending',
    'reading the success page state changed or misreported payment';
  assert (select status = 'pending' from public.payments
    where id = v_expiring_payment_id),
    'success-state read marked payment paid';

  v_result := public.process_stripe_checkout_event(
    'evt_sql_amount_mismatch',
    'checkout.session.completed',
    'cs_test_sql_expiring',
    'pi_test_sql_expiring',
    v_expiring_payment_id,
    v_expiring_order_id,
    1,
    'ron',
    'paid',
    'payment'
  );
  assert not (v_result->>'success')::boolean
    and v_result->>'code' = 'reconciliation_failed',
    'amount mismatch was accepted';
  assert (select status = 'pending' from public.payments
    where id = v_expiring_payment_id),
    'amount mismatch changed payment';

  v_result := public.process_stripe_checkout_event(
    'evt_sql_currency_mismatch',
    'checkout.session.completed',
    'cs_test_sql_expiring',
    'pi_test_sql_expiring',
    v_expiring_payment_id,
    v_expiring_order_id,
    3750,
    'eur',
    'paid',
    'payment'
  );
  assert not (v_result->>'success')::boolean,
    'currency mismatch was accepted';

  v_result := public.process_stripe_checkout_event(
    'evt_sql_session_mismatch',
    'checkout.session.completed',
    'cs_test_sql_wrong',
    'pi_test_sql_expiring',
    v_expiring_payment_id,
    v_expiring_order_id,
    3750,
    'ron',
    'paid',
    'payment'
  );
  assert not (v_result->>'success')::boolean,
    'Session ID mismatch was accepted';

  v_result := public.process_stripe_checkout_event(
    'evt_sql_expired',
    'checkout.session.expired',
    'cs_test_sql_expiring',
    null,
    v_expiring_payment_id,
    v_expiring_order_id,
    3750,
    'ron',
    'unpaid',
    'payment'
  );
  assert (v_result->>'success')::boolean,
    'expired event was not processed';
  assert (select status = 'expired' from public.payments
    where id = v_expiring_payment_id),
    'expired event did not expire payment';
  assert (select status = 'cancelled' from public.orders
    where id = v_expiring_order_id),
    'expired event did not cancel awaiting order';
  assert (select bool_and(status = 'expired')
    from public.stock_reservations where order_id = v_expiring_order_id),
    'expired event did not release reservation';
  assert (select quantity = 1 from public.inventory
    where id = v_expiring_inventory_id),
    'expired event changed physical inventory';
  assert not exists (select 1 from public.inventory_movements
    where context->>'paymentId' = v_expiring_payment_id::text),
    'expired event created a sale movement';

  v_result := public.process_stripe_checkout_event(
    'evt_sql_expired',
    'checkout.session.expired',
    'cs_test_sql_expiring',
    null,
    v_expiring_payment_id,
    v_expiring_order_id,
    3750,
    'ron',
    'unpaid',
    'payment'
  );
  assert (v_result->>'idempotentReplay')::boolean,
    'duplicate expired event was not idempotent';
  assert (select count(*) = 1 from public.stripe_webhook_events
    where event_id = 'evt_sql_expired'),
    'duplicate expired event was recorded twice';
end;
$$;

rollback;
