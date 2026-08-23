begin;

do $$
declare
  v_product_id uuid := '51000000-0000-4000-8000-000000000001';
  v_customization_id uuid := '51000000-0000-4000-8000-000000000002';
  v_shipping_id uuid := '51000000-0000-4000-8000-000000000003';
  v_order_id uuid := '51000000-0000-4000-8000-000000000004';
  v_quote jsonb;
begin
  assert to_regclass('public.orders') is not null, 'orders table is missing';
  assert to_regclass('public.order_items') is not null, 'order_items table is missing';
  assert to_regclass('public.order_status_history') is not null, 'order_status_history table is missing';
  assert to_regclass('public.shipping_methods') is not null, 'shipping_methods table is missing';

  assert (select relrowsecurity from pg_class where oid = 'public.orders'::regclass),
    'orders RLS must be enabled';
  assert (select count(*) = 2 from pg_policies where schemaname = 'public' and tablename = 'orders'),
    'orders ownership/admin policies are missing';
  assert not has_table_privilege('anon', 'public.orders', 'select'),
    'anonymous users must not receive order access';
  assert has_table_privilege('anon', 'public.shipping_methods', 'select'),
    'anonymous checkout must be able to list active shipping methods';
  assert not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'orders'
      and policyname <> 'orders_admin_all'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  ), 'customers must not have an order write policy';

  insert into public.products (
    id, name, slug, base_price, product_type, publication_status,
    availability_status, is_customizable
  ) values (
    v_product_id, 'Produs checkout SQL', 'produs-checkout-sql', 12.34,
    'standard', 'published', 'in_stock', true
  );
  insert into public.customization_options (
    id, product_id, name, option_type, is_required, additional_cost, configuration
  ) values (
    v_customization_id, v_product_id, 'Mesaj', 'text', true, 2.01,
    '{"min_length": 3, "max_length": 10}'::jsonb
  );
  insert into public.inventory (product_id, quantity) values (v_product_id, 2);

  v_quote := public.quote_checkout(jsonb_build_array(jsonb_build_object(
    'key', 'line-1',
    'productId', v_product_id,
    'variantId', null,
    'quantity', 2,
    'customizations', jsonb_build_array(jsonb_build_object(
      'id', v_customization_id,
      'value', 'Ana'
    )),
    'unitPriceMinor', 1
  )));
  assert (v_quote->>'valid')::boolean, 'valid cart must quote successfully';
  assert (v_quote->>'subtotalMinor')::bigint = 2870,
    'quote must rebuild price from DB and use integer minor units';
  assert (v_quote#>>'{lines,0,unitPriceMinor}')::bigint = 1435,
    'server unit price must include authoritative customization cost';

  v_quote := public.quote_checkout(jsonb_build_array(jsonb_build_object(
    'key', 'line-stock', 'productId', v_product_id, 'quantity', 3,
    'customizations', jsonb_build_array(jsonb_build_object(
      'id', v_customization_id, 'value', 'Ana'
    ))
  )));
  assert not (v_quote->>'valid')::boolean, 'insufficient stock must invalidate quote';
  assert v_quote#>>'{errors,0,code}' = 'insufficient_stock',
    'stock failure must have an explicit code';

  v_quote := public.quote_checkout(jsonb_build_array(jsonb_build_object(
    'key', 'line-variant', 'productId', v_product_id, 'quantity', 1,
    'variantId', '51000000-0000-4000-8000-000000000099',
    'customizations', jsonb_build_array(jsonb_build_object(
      'id', v_customization_id, 'value', 'Ana'
    ))
  )));
  assert v_quote#>>'{errors,0,code}' = 'variant_invalid',
    'a variant sent for a product without variants must be rejected';

  v_quote := public.quote_checkout(jsonb_build_array(jsonb_build_object(
    'key', 'line-customization', 'productId', v_product_id, 'quantity', 1,
    'customizations', jsonb_build_array(jsonb_build_object(
      'id', '51000000-0000-4000-8000-000000000099', 'value', 'Ana'
    ))
  )));
  assert v_quote#>>'{errors,0,code}' = 'customization_invalid',
    'unknown customizations must be rejected';

  update public.products set availability_status = 'unavailable'
  where id = v_product_id;
  v_quote := public.quote_checkout(jsonb_build_array(jsonb_build_object(
    'key', 'line-unavailable', 'productId', v_product_id, 'quantity', 1,
    'customizations', '[]'::jsonb
  )));
  assert v_quote#>>'{errors,0,code}' = 'product_unavailable',
    'unavailable products must be rejected';
  update public.products set availability_status = 'in_stock'
  where id = v_product_id;

  v_quote := public.quote_checkout('[{"key":"bad","productId":"not-a-uuid","quantity":1}]'::jsonb);
  assert not (v_quote->>'valid')::boolean, 'malformed UUID must be rejected without an exception';

  insert into public.shipping_methods (id, code, name, price_minor)
  values (v_shipping_id, 'sql-test', 'Curier SQL test', 1500);
  insert into public.orders (
    id, idempotency_key, request_fingerprint, user_id, email, phone, customer_type,
    shipping_address, billing_address, shipping_method_id,
    shipping_method_code, shipping_method_name, payment_method,
    subtotal_minor, shipping_minor, total_minor
  ) values (
    v_order_id, '51000000-0000-4000-8000-000000000005', '{}'::jsonb, null,
    'guest@example.com', '0712345678', 'individual',
    '{"city":"București"}', '{"city":"București"}', v_shipping_id,
    'sql-test', 'Curier SQL test', 'cash_on_delivery', 2870, 1500, 4370
  );
  insert into public.order_items (
    order_id, product_id, product_name, product_slug,
    unit_base_price_minor, customization_total_minor, unit_price_minor,
    quantity, line_subtotal_minor, customizations_snapshot
  ) values (
    v_order_id, v_product_id, 'Produs checkout SQL', 'produs-checkout-sql',
    1234, 201, 1435, 2, 2870, '[{"name":"Mesaj","value":"Ana"}]'
  );
  insert into public.order_status_history (order_id, to_status)
  values (v_order_id, 'new');

  assert (select user_id is null from public.orders where id = v_order_id),
    'guest orders must allow a null user_id';
  assert (select total_minor = subtotal_minor + shipping_minor from public.orders where id = v_order_id),
    'order total must equal subtotal plus shipping';
  assert (select count(*) = 1 from public.order_items where order_id = v_order_id),
    'order item snapshot was not stored';
  assert (select count(*) = 1 from public.order_status_history where order_id = v_order_id),
    'initial status history was not stored';
end;
$$;

rollback;
