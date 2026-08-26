begin;

do $$
declare
  v_product_id uuid := '52000000-0000-4000-8000-000000000001';
  v_made_to_order_id uuid := '52000000-0000-4000-8000-000000000002';
  v_unique_id uuid := '52000000-0000-4000-8000-000000000003';
  v_customization_id uuid := '52000000-0000-4000-8000-000000000004';
  v_shipping_id uuid := '52000000-0000-4000-8000-000000000005';
  v_customer_id uuid := '52000000-0000-4000-8000-000000000006';
  v_guest_key uuid := '52000000-0000-4000-8000-000000000010';
  v_customer_key uuid := '52000000-0000-4000-8000-000000000011';
  v_unique_key uuid := '52000000-0000-4000-8000-000000000012';
  v_result jsonb;
  v_guest_order_id uuid;
  v_checkout jsonb;
  v_guest_lines jsonb;
  v_inventory_before integer;
begin
  assert to_regprocedure('public.place_cod_order(uuid,jsonb,jsonb)') is not null,
    'place_cod_order is missing';
  assert to_regprocedure('public.get_order_confirmation(uuid)') is not null,
    'get_order_confirmation is missing';
  assert has_function_privilege(
    'anon', 'public.place_cod_order(uuid,jsonb,jsonb)', 'execute'
  ), 'guest cannot execute place_cod_order';
  assert has_function_privilege(
    'authenticated', 'public.place_cod_order(uuid,jsonb,jsonb)', 'execute'
  ), 'customer cannot execute place_cod_order';
  assert not has_table_privilege('anon', 'public.orders', 'insert'),
    'guest received direct order insert privilege';

  insert into public.products (
    id, name, slug, base_price, product_type, publication_status,
    availability_status, is_customizable
  ) values
    (v_product_id, 'Produs COD SQL', 'produs-cod-sql', 20.00,
      'standard', 'published', 'in_stock', true),
    (v_made_to_order_id, 'Produs fără stoc SQL', 'produs-fara-stoc-sql', 30.00,
      'made_to_order', 'published', 'made_to_order', false),
    (v_unique_id, 'Unicat COD SQL', 'unicat-cod-sql', 50.00,
      'unique', 'published', 'unique', false);

  insert into public.customization_options (
    id, product_id, name, option_type, is_required, additional_cost, configuration
  ) values (
    v_customization_id, v_product_id, 'Mesaj', 'text', true, 2.50,
    '{"min_length": 2, "max_length": 20}'::jsonb
  );
  insert into public.inventory (product_id, quantity)
  values (v_product_id, 3), (v_unique_id, 1);
  insert into public.shipping_methods (id, code, name, price_minor)
  values (v_shipping_id, 'cod-sql-test', 'Curier COD SQL', 750);

  v_checkout := jsonb_build_object(
    'email', 'guest@example.com',
    'phone', '0712345678',
    'customerType', 'individual',
    'companyName', '',
    'companyTaxId', '',
    'companyRegistrationNumber', '',
    'shippingAddress', jsonb_build_object(
      'recipientName', 'Guest SQL', 'phone', '0712345678',
      'addressLine1', 'Strada Test 1', 'addressLine2', '',
      'city', 'București', 'county', 'București',
      'postalCode', '010101', 'countryCode', 'RO'
    ),
    'billingSameAsShipping', true,
    'billingAddress', '{}'::jsonb,
    'shippingMethodId', v_shipping_id,
    'paymentMethod', 'cash_on_delivery',
    'shippingMinor', 1
  );
  v_guest_lines := jsonb_build_array(jsonb_build_object(
    'key', 'guest-line',
    'productId', v_product_id,
    'variantId', null,
    'quantity', 2,
    'unitPriceMinor', 1,
    'customizations', jsonb_build_array(jsonb_build_object(
      'id', v_customization_id, 'value', 'Ana'
    ))
  ));
  select quantity into v_inventory_before
  from public.inventory where product_id = v_product_id;

  perform set_config('request.jwt.claim.sub', '', true);
  v_result := public.place_cod_order(v_guest_key, v_guest_lines, v_checkout);
  assert (v_result->>'success')::boolean, 'guest COD order failed';
  assert not (v_result->>'idempotentReplay')::boolean,
    'first request was incorrectly marked as replay';
  v_guest_order_id := (v_result->>'orderId')::uuid;
  assert (v_result->>'subtotalMinor')::bigint = 4500,
    'browser price manipulation changed authoritative subtotal';
  assert (v_result->>'shippingMinor')::bigint = 750,
    'browser shipping manipulation changed authoritative shipping';
  assert (v_result->>'totalMinor')::bigint = 5250,
    'authoritative total is incorrect';
  assert (select user_id is null from public.orders where id = v_guest_order_id),
    'guest order unexpectedly has a user';
  assert (select payment_method = 'cash_on_delivery' and payment_status = 'unpaid'
    and status = 'new' from public.orders where id = v_guest_order_id),
    'COD initial state is incorrect';
  assert (select count(*) = 1 from public.order_items where order_id = v_guest_order_id),
    'authoritative order item snapshot is missing';
  assert (select quantity = v_inventory_before - 2
    from public.inventory where product_id = v_product_id),
    'tracked inventory was not decremented';
  assert (select count(*) = 1 from public.inventory_movements
    where context->>'orderId' = v_guest_order_id::text
      and quantity_delta = -2 and quantity_before = 3 and quantity_after = 1),
    'inventory movement audit is incorrect';
  assert (public.get_order_confirmation((v_result->>'confirmationToken')::uuid)->>'found')::boolean,
    'confirmation bearer token cannot read the minimal DTO';
  assert not (public.get_order_confirmation(gen_random_uuid())->>'found')::boolean,
    'unknown confirmation token unexpectedly resolves';

  v_result := public.place_cod_order(v_guest_key, v_guest_lines, v_checkout);
  assert (v_result->>'success')::boolean
    and (v_result->>'idempotentReplay')::boolean,
    'identical retry did not return the original order';
  assert (v_result->>'orderId')::uuid = v_guest_order_id,
    'idempotent retry returned a different order';
  assert (select count(*) = 1 from public.orders where idempotency_key = v_guest_key),
    'idempotent retry created a duplicate order';
  assert (select quantity = 1 from public.inventory where product_id = v_product_id),
    'idempotent retry decremented stock twice';

  v_result := public.place_cod_order(
    v_guest_key,
    v_guest_lines,
    jsonb_set(v_checkout, '{phone}', '"0799999999"')
  );
  assert not (v_result->>'success')::boolean
    and v_result->>'code' = 'idempotency_conflict',
    'incompatible idempotency reuse was not rejected';

  v_result := public.place_cod_order(
    '52000000-0000-4000-8000-000000000020',
    jsonb_build_array(jsonb_build_object(
      'key', 'bad-product', 'productId', gen_random_uuid(),
      'quantity', 1, 'customizations', '[]'::jsonb
    )),
    v_checkout
  );
  assert not (v_result->>'success')::boolean and v_result->>'code' = 'cart_invalid',
    'invalid product was not rejected';
  assert (select count(*) = 1 from public.orders
    where idempotency_key::text like '52000000-%'),
    'failed placement left a partial order';

  v_result := public.place_cod_order(
    '52000000-0000-4000-8000-000000000021',
    jsonb_build_array(jsonb_build_object(
      'key', 'bad-variant', 'productId', v_product_id,
      'variantId', gen_random_uuid(), 'quantity', 1,
      'customizations', jsonb_build_array(jsonb_build_object(
        'id', v_customization_id, 'value', 'Ana'
      ))
    )),
    v_checkout
  );
  assert not (v_result->>'success')::boolean, 'invalid variant was not rejected';

  v_result := public.place_cod_order(
    '52000000-0000-4000-8000-000000000022',
    jsonb_build_array(jsonb_build_object(
      'key', 'bad-customization', 'productId', v_product_id,
      'quantity', 1, 'customizations', jsonb_build_array(jsonb_build_object(
        'id', gen_random_uuid(), 'value', 'Ana'
      ))
    )),
    v_checkout
  );
  assert not (v_result->>'success')::boolean,
    'invalid customization was not rejected';

  v_result := public.place_cod_order(
    '52000000-0000-4000-8000-000000000023',
    jsonb_build_array(jsonb_build_object(
      'key', 'stock', 'productId', v_product_id,
      'quantity', 2, 'customizations', jsonb_build_array(jsonb_build_object(
        'id', v_customization_id, 'value', 'Ana'
      ))
    )),
    v_checkout
  );
  assert not (v_result->>'success')::boolean,
    'insufficient stock was not rejected';
  assert (select quantity = 1 from public.inventory where product_id = v_product_id),
    'failed stock validation changed inventory';

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values (
    v_customer_id, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'customer-cod@example.com', '',
    now(), '{"provider":"email","providers":["email"]}', '{}'::jsonb,
    now(), now()
  );
  perform set_config('request.jwt.claim.sub', v_customer_id::text, true);
  v_result := public.place_cod_order(
    v_customer_key,
    jsonb_build_array(jsonb_build_object(
      'key', 'made-to-order', 'productId', v_made_to_order_id,
      'quantity', 1, 'customizations', '[]'::jsonb
    )),
    jsonb_set(v_checkout, '{email}', '"customer-cod@example.com"')
  );
  assert (v_result->>'success')::boolean, 'customer COD order failed';
  assert (select user_id = v_customer_id from public.orders
    where id = (v_result->>'orderId')::uuid),
    'customer user_id was not derived from auth.uid';
  assert not exists (select 1 from public.inventory_movements
    where context->>'orderId' = v_result->>'orderId'),
    'product without inventory created a fictitious movement';

  perform set_config('request.jwt.claim.sub', '', true);
  v_result := public.place_cod_order(
    v_unique_key,
    jsonb_build_array(jsonb_build_object(
      'key', 'unique', 'productId', v_unique_id,
      'quantity', 1, 'customizations', '[]'::jsonb
    )),
    v_checkout
  );
  assert (v_result->>'success')::boolean,
    'unique order failed: ' || v_result::text;
  assert (select quantity = 0 from public.inventory where product_id = v_unique_id),
    'unique inventory was not consumed';
  assert (select availability_status = 'unavailable' from public.products
    where id = v_unique_id),
    'sold unique product was not marked unavailable';
  v_result := public.place_cod_order(
    '52000000-0000-4000-8000-000000000024',
    jsonb_build_array(jsonb_build_object(
      'key', 'unique-second', 'productId', v_unique_id,
      'quantity', 1, 'customizations', '[]'::jsonb
    )),
    v_checkout
  );
  assert not (v_result->>'success')::boolean,
    'unique product was sold twice';

  assert (select count(*) = 3 from public.orders
    where idempotency_key::text like '52000000-%'),
    'unexpected orders remained after failed placement attempts';
end;
$$;

rollback;
