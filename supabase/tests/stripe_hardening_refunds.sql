begin;

do $$
declare
  v_product_id uuid := '6c000000-0000-4000-8000-000000000001';
  v_second_product_id uuid := '6c000000-0000-4000-8000-000000000002';
  v_shipping_id uuid := '6c000000-0000-4000-8000-000000000003';
  v_key uuid := '6c000000-0000-4000-8000-000000000010';
  v_second_key uuid := '6c000000-0000-4000-8000-000000000011';
  v_third_key uuid := '6c000000-0000-4000-8000-000000000012';
  v_cleanup_key uuid := '6c000000-0000-4000-8000-000000000013';
  v_checkout jsonb;
  v_lines jsonb;
  v_result jsonb;
  v_order_id uuid;
  v_payment_id uuid;
  v_refund_id uuid;
  v_second_order_id uuid;
  v_second_payment_id uuid;
  v_third_order_id uuid;
  v_third_payment_id uuid;
  v_cleanup_order_id uuid;
  v_cleanup_payment_id uuid;
  v_inventory_id uuid;
  v_second_inventory_id uuid;
  v_inventory_before integer;
begin
  assert to_regclass('public.payment_refunds') is not null,
    'payment_refunds is missing';
  assert (select relrowsecurity from pg_class
    where oid = 'public.payment_refunds'::regclass),
    'payment_refunds RLS must be enabled';
  assert not has_table_privilege('anon', 'public.payment_refunds', 'insert'),
    'anon can create refunds';
  assert not has_table_privilege('authenticated', 'public.payment_refunds', 'update'),
    'authenticated can force refund state';
  assert not has_function_privilege('authenticated',
    'public.prepare_full_stripe_refund(uuid,text,uuid)', 'execute'),
    'browser can prepare refunds';
  assert has_function_privilege('service_role',
    'public.process_stripe_refund_event(text,text,text,text,uuid,uuid,uuid,bigint,text,text,text)',
    'execute'), 'service role cannot process refund webhook';

  insert into public.products (
    id, name, slug, base_price, product_type, publication_status,
    availability_status, is_customizable
  ) values
    (v_product_id, 'Fixture 6C refund', 'fixture-6c-refund', 20.00,
      'standard', 'published', 'in_stock', false),
    (v_second_product_id, 'Fixture 6C out of order',
      'fixture-6c-out-of-order', 30.00,
      'unique', 'published', 'unique', false);
  insert into public.inventory (product_id, quantity)
  values (v_product_id, 3), (v_second_product_id, 1);
  select id into v_inventory_id from public.inventory where product_id = v_product_id;
  select id into v_second_inventory_id from public.inventory
    where product_id = v_second_product_id;
  insert into public.shipping_methods (id, code, name, price_minor)
  values (v_shipping_id, 'stripe-6c-sql', 'Curier 6C SQL', 500);

  v_checkout := jsonb_build_object(
    'email', 'stripe-6c@example.com', 'phone', '0712345678',
    'customerType', 'individual', 'companyName', '', 'companyTaxId', '',
    'companyRegistrationNumber', '',
    'shippingAddress', jsonb_build_object(
      'recipientName', 'Ana 6C', 'phone', '0712345678',
      'addressLine1', 'Strada 6C 1', 'addressLine2', '',
      'city', 'București', 'county', 'București',
      'postalCode', '010101', 'countryCode', 'RO'),
    'billingSameAsShipping', true, 'billingAddress', '{}'::jsonb,
    'shippingMethodId', v_shipping_id, 'paymentMethod', 'card');
  v_lines := jsonb_build_array(jsonb_build_object(
    'key', 'fixture-6c', 'productId', v_product_id, 'variantId', null,
    'quantity', 1, 'customizations', '[]'::jsonb));

  v_result := public.prepare_card_order_server(v_key, v_lines, v_checkout, null);
  assert (v_result->>'success')::boolean, '6C paid preparation failed';
  v_order_id := (v_result->>'orderId')::uuid;
  v_payment_id := (v_result->>'paymentId')::uuid;
  perform public.attach_stripe_checkout_session(v_payment_id,
    'cs_test_6c_paid', statement_timestamp() + interval '30 minutes');

  -- Passing the local TTL cannot release or expose an attached Stripe hold.
  update public.stock_reservations
    set created_at = statement_timestamp() - interval '1 hour',
        expires_at = statement_timestamp() - interval '1 second'
    where payment_id = v_payment_id;
  update public.payments
    set created_at = statement_timestamp() - interval '1 hour',
        pending_expires_at = statement_timestamp() - interval '1 second'
    where id = v_payment_id;
  v_result := public.expire_stock_reservations(statement_timestamp());
  assert (select bool_and(status = 'active') from public.stock_reservations
    where payment_id = v_payment_id), 'attached reservation stopped blocking stock';
  assert (select status = 'pending' from public.payments where id = v_payment_id),
    'local cleanup changed the attached fixture payment';
  assert (select status = 'awaiting_payment' from public.orders where id = v_order_id),
    'local cleanup changed the attached fixture order';
  v_result := public.quote_checkout(jsonb_build_array(jsonb_build_object(
    'key', 'all-stock', 'productId', v_product_id, 'variantId', null,
    'quantity', 3, 'customizations', '[]'::jsonb)));
  assert not (v_result->>'valid')::boolean,
    'stale attached Stripe reservation became available prematurely';

  v_result := public.process_stripe_checkout_event_hardened(
    'evt_6c_completed_a', 'checkout.session.completed', 'cs_test_6c_paid',
    'pi_6c_paid', v_payment_id, v_order_id, 2500, 'ron', 'paid', 'payment',
    statement_timestamp() + interval '30 minutes');
  assert (v_result->>'success')::boolean, 'completed event failed';
  v_result := public.process_stripe_checkout_event_hardened(
    'evt_6c_completed_b', 'checkout.session.completed', 'cs_test_6c_paid',
    'pi_6c_paid', v_payment_id, v_order_id, 2500, 'ron', 'paid', 'payment',
    statement_timestamp() + interval '30 minutes');
  assert (v_result#>>'{result,action}') = 'ignored_already_paid',
    'semantic completed duplicate was not idempotent';
  assert (select count(*) = 1 from public.inventory_movements
    where context->>'paymentId' = v_payment_id::text),
    'semantic completed duplicate created two movements';
  assert (select quantity = 2 from public.inventory where id = v_inventory_id),
    'semantic completed duplicate decremented twice';

  v_result := public.process_stripe_checkout_event_hardened(
    'evt_6c_expired_after_paid', 'checkout.session.expired', 'cs_test_6c_paid',
    'pi_6c_paid', v_payment_id, v_order_id, 2500, 'ron', 'unpaid', 'payment',
    statement_timestamp() + interval '30 minutes');
  assert (select status = 'paid' from public.payments where id = v_payment_id),
    'expired degraded paid payment';

  v_result := public.process_stripe_checkout_event_hardened(
    'evt_6c_unknown', 'checkout.session.expired', 'cs_test_6c_unknown',
    null, null, null, 100, 'ron', 'unpaid', 'payment',
    statement_timestamp() + interval '30 minutes');
  assert (v_result->>'classification') = 'ignored_unmatched',
    'unknown authentic Session was not permanently ignored';
  assert (select classification = 'ignored_unmatched'
    from public.stripe_webhook_events where event_id = 'evt_6c_unknown'),
    'unknown Session outcome was not audited';

  v_result := public.prepare_full_stripe_refund(v_payment_id, 'Test 6C', null);
  assert (v_result->>'success')::boolean and not (v_result->>'idempotentReplay')::boolean,
    'full refund was not prepared';
  v_refund_id := (v_result->>'refundId')::uuid;
  perform public.attach_stripe_refund(v_refund_id, 're_6c_full',
    'pi_6c_paid', 2500, 'ron');
  v_inventory_before := (select quantity from public.inventory where id = v_inventory_id);
  v_result := public.process_stripe_refund_event(
    'evt_6c_refund_succeeded', 'refund.updated', 're_6c_full', 'pi_6c_paid',
    v_refund_id, v_payment_id, v_order_id, 2500, 'ron', 'succeeded', null);
  assert (select status = 'succeeded' from public.payment_refunds where id = v_refund_id),
    'refund record was not succeeded';
  assert (select status = 'refunded' from public.payments where id = v_payment_id),
    'payment was not refunded';
  assert (select status = 'refunded' and payment_status = 'refunded'
    from public.orders where id = v_order_id), 'order was not refunded';
  assert (select quantity = v_inventory_before from public.inventory
    where id = v_inventory_id), 'full refund restocked consumed inventory';
  v_result := public.prepare_full_stripe_refund(v_payment_id, 'Test 6C', null);
  assert (v_result->>'success')::boolean
    and (v_result->>'idempotentReplay')::boolean
    and (v_result->>'refundId')::uuid = v_refund_id,
    'full refund retry did not converge to the original refund';
  v_result := public.process_stripe_refund_event(
    'evt_6c_refund_succeeded', 'refund.updated', 're_6c_full', 'pi_6c_paid',
    v_refund_id, v_payment_id, v_order_id, 2500, 'ron', 'succeeded', null);
  assert (v_result->>'idempotentReplay')::boolean,
    'duplicate refund Event ID was not idempotent';
  v_result := public.process_stripe_checkout_event_hardened(
    'evt_6c_completed_after_refund', 'checkout.session.completed', 'cs_test_6c_paid',
    'pi_6c_paid', v_payment_id, v_order_id, 2500, 'ron', 'paid', 'payment',
    statement_timestamp() + interval '30 minutes');
  assert (v_result#>>'{result,action}') = 'ignored_terminal_refunded',
    'completed event degraded refunded terminal state';

  -- Refund before completed: release the hold, never decrement, and preserve
  -- refunded when the completed event arrives later.
  v_lines := jsonb_build_array(jsonb_build_object(
    'key', 'out-of-order', 'productId', v_second_product_id, 'variantId', null,
    'quantity', 1, 'customizations', '[]'::jsonb));
  v_result := public.prepare_card_order_server(v_second_key, v_lines, v_checkout, null);
  v_second_order_id := (v_result->>'orderId')::uuid;
  v_second_payment_id := (v_result->>'paymentId')::uuid;
  perform public.attach_stripe_checkout_session(v_second_payment_id,
    'cs_test_6c_out_of_order', statement_timestamp() + interval '30 minutes');
  v_result := public.process_stripe_refund_event(
    'evt_6c_refund_before_completed', 'refund.created', 're_6c_before',
    'pi_6c_before', null, v_second_payment_id, v_second_order_id,
    3500, 'ron', 'succeeded', null);
  assert (select status = 'refunded' from public.payments
    where id = v_second_payment_id), 'refund-before-completed not reflected';
  assert (select bool_and(status = 'released') from public.stock_reservations
    where payment_id = v_second_payment_id), 'refund-before-completed did not release';
  assert (select quantity = 1 from public.inventory
    where id = v_second_inventory_id), 'refund-before-completed decremented inventory';
  assert not exists (select 1 from public.inventory_movements
    where context->>'paymentId' = v_second_payment_id::text),
    'refund-before-completed created sale movement';
  v_result := public.process_stripe_checkout_event_hardened(
    'evt_6c_late_completed', 'checkout.session.completed',
    'cs_test_6c_out_of_order', 'pi_6c_before', v_second_payment_id,
    v_second_order_id, 3500, 'ron', 'paid', 'payment',
    statement_timestamp() + interval '30 minutes');
  assert (select status = 'refunded' from public.payments
    where id = v_second_payment_id), 'late completed degraded refund';
  assert (select quantity = 1 from public.inventory
    where id = v_second_inventory_id), 'late completed consumed released unit';

  -- Recover Session created at Stripe when DB attach previously failed.
  v_result := public.prepare_card_order_server(v_third_key,
    jsonb_build_array(jsonb_build_object(
      'key', 'orphan-recovery', 'productId', v_product_id, 'variantId', null,
      'quantity', 1, 'customizations', '[]'::jsonb)), v_checkout, null);
  v_third_order_id := (v_result->>'orderId')::uuid;
  v_third_payment_id := (v_result->>'paymentId')::uuid;
  v_result := public.process_stripe_checkout_event_hardened(
    'evt_6c_orphan_recovery', 'checkout.session.expired', 'cs_test_6c_orphan',
    null, v_third_payment_id, v_third_order_id, 2500, 'ron', 'unpaid', 'payment',
    statement_timestamp() + interval '30 minutes');
  assert (v_result#>>'{result,orphanSessionRecovered}')::boolean,
    'recoverable orphan Session was not attached';
  assert (select provider_checkout_session_id = 'cs_test_6c_orphan'
    and status = 'expired' from public.payments where id = v_third_payment_id),
    'orphan Session recovery did not finish expiry';

  -- Local expiry assertions are scoped to this unattached fixture. The cleanup
  -- result can legitimately include other stale Development rows.
  v_result := public.prepare_card_order_server(v_cleanup_key,
    jsonb_build_array(jsonb_build_object(
      'key', 'local-cleanup', 'productId', v_product_id, 'variantId', null,
      'quantity', 1, 'customizations', '[]'::jsonb)), v_checkout, null);
  assert (v_result->>'success')::boolean, 'local cleanup fixture preparation failed';
  v_cleanup_order_id := (v_result->>'orderId')::uuid;
  v_cleanup_payment_id := (v_result->>'paymentId')::uuid;
  perform public.expire_stock_reservations(statement_timestamp() + interval '1 hour');
  assert (select status = 'expired' from public.stock_reservations
    where payment_id = v_cleanup_payment_id),
    'unattached fixture reservation was not expired';
  assert (select status = 'expired' and provider_checkout_session_id is null
    from public.payments where id = v_cleanup_payment_id),
    'unattached fixture payment was not expired';
  assert (select status = 'cancelled' from public.orders
    where id = v_cleanup_order_id),
    'unattached fixture order was not cancelled';

  -- Failed and partial external refunds are audited without claiming a full refund.
  v_result := public.process_stripe_refund_event(
    'evt_6c_partial', 'refund.updated', 're_6c_partial', 'pi_6c_before',
    null, v_second_payment_id, v_second_order_id, 100, 'ron', 'succeeded', null);
  assert (v_result#>>'{result,action}') = 'partial_refund_recorded',
    'partial external refund was not recorded distinctly';
  assert (select status = 'refunded' from public.orders where id = v_second_order_id),
    'partial event changed an already terminal refunded order unexpectedly';

  assert not exists (select 1 from public.inventory where quantity < 0),
    'inventory became negative';
end;
$$;

rollback;
