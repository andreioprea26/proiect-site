begin;

do $$
declare
  v_unsafe_function text;
  v_unexpected_anon_function text;
begin
  assert not exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  ), 'a public application table is missing RLS';

  select p.oid::regprocedure::text into v_unsafe_function
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and not exists (
      select 1
      from unnest(coalesce(p.proconfig, '{}'::text[])) setting
      where setting in ('search_path=', 'search_path=""')
    )
  limit 1;
  assert v_unsafe_function is null,
    format('SECURITY DEFINER has unsafe search_path: %s', v_unsafe_function);

  assert not exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and has_function_privilege('public', p.oid, 'EXECUTE')
  ), 'PUBLIC can execute a SECURITY DEFINER function';

  select p.oid::regprocedure::text into v_unexpected_anon_function
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and has_function_privilege('anon', p.oid, 'EXECUTE')
    and p.proname not in (
      'get_approved_product_reviews',
      'get_order_confirmation',
      'get_public_homepage_blocks',
      'place_cod_order',
      'quote_checkout',
      'submit_contact_request',
      'submit_custom_order_request',
      'subscribe_newsletter'
    )
  limit 1;
  assert v_unexpected_anon_function is null,
    format('anon can execute unexpected SECURITY DEFINER: %s', v_unexpected_anon_function);

  assert not has_function_privilege('anon', 'public.manage_newsletter_subscription(uuid,boolean)', 'EXECUTE'),
    'anon can manage newsletter subscriptions';
  assert not has_function_privilege('anon', 'public.manage_contact_request(uuid,public.contact_request_status,text)', 'EXECUTE'),
    'anon can manage contact requests';
  assert not has_function_privilege('anon', 'public.manage_custom_order_request(uuid,public.custom_request_status,text)', 'EXECUTE'),
    'anon can manage custom requests';
  assert not has_function_privilege('anon', 'public.upsert_content_page(uuid,text,text,text,public.content_page_status)', 'EXECUTE'),
    'anon can modify content pages';
  assert not has_function_privilege('anon', 'public.next_order_public_number()', 'EXECUTE'),
    'anon can consume order numbers';
  assert not has_function_privilege('authenticated', 'public.next_order_public_number()', 'EXECUTE'),
    'customer can consume order numbers';
  assert has_function_privilege('service_role', 'public.next_order_public_number()', 'EXECUTE'),
    'service role cannot assign order numbers';

  assert not has_table_privilege('anon', 'public.profiles', 'SELECT'),
    'anon can read profiles';
  assert not has_table_privilege('anon', 'public.user_roles', 'SELECT'),
    'anon can read roles';
  assert not has_table_privilege('anon', 'public.customer_addresses', 'SELECT'),
    'anon can read customer addresses';
  assert has_table_privilege('authenticated', 'public.profiles', 'SELECT'),
    'customer cannot read own profile through RLS';
  assert has_table_privilege('authenticated', 'public.profiles', 'UPDATE'),
    'customer cannot update own profile through RLS';
  assert not has_table_privilege('authenticated', 'public.profiles', 'INSERT'),
    'customer can insert profiles directly';
  assert has_table_privilege('authenticated', 'public.user_roles', 'SELECT'),
    'customer cannot read own roles through RLS';
  assert not has_table_privilege('authenticated', 'public.user_roles', 'INSERT'),
    'customer can grant roles';
  assert not has_table_privilege('authenticated', 'public.user_roles', 'UPDATE'),
    'customer can change roles';
  assert has_table_privilege('authenticated', 'public.customer_addresses', 'SELECT,INSERT,UPDATE,DELETE'),
    'customer address grants are incomplete';

  assert not has_table_privilege('anon', 'public.orders', 'SELECT'),
    'anon can list orders';
  assert not has_table_privilege('authenticated', 'public.orders', 'UPDATE'),
    'customer can modify order state directly';
  assert not has_table_privilege('authenticated', 'public.payments', 'UPDATE'),
    'customer can modify payment state directly';
  assert not has_table_privilege('authenticated', 'public.inventory', 'UPDATE'),
    'customer can modify inventory directly';
  assert exists (
    select 1 from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'inventory'
      and policyname = 'inventory_admin_insert_zero'
      and with_check like '%is_admin()%'
  ), 'inventory insert policy is not admin-only';
  assert not has_table_privilege('authenticated', 'public.inventory_movements', 'INSERT'),
    'customer can forge inventory movements';
  assert not has_table_privilege('authenticated', 'public.stock_reservations', 'INSERT'),
    'customer can create stock reservations directly';
  assert not has_table_privilege('authenticated', 'public.payment_refunds', 'INSERT'),
    'customer can create refunds directly';
  assert not has_table_privilege('authenticated', 'public.shipments', 'INSERT'),
    'customer can create shipments directly';
  assert not has_table_privilege('authenticated', 'public.cod_collections', 'UPDATE'),
    'customer can mark COD as collected directly';
  assert not has_table_privilege('authenticated', 'public.notification_logs', 'INSERT'),
    'customer can forge notification audit rows';
  assert not has_table_privilege('anon', 'public.newsletter_subscribers', 'SELECT'),
    'anon can list newsletter PII';
  assert not has_table_privilege('anon', 'public.contact_requests', 'SELECT'),
    'anon can list contact PII';
  assert not has_table_privilege('anon', 'public.custom_order_requests', 'SELECT'),
    'anon can list custom-request PII';
  assert not has_table_privilege('anon', 'public.reviews', 'SELECT'),
    'anon can bypass approved-review projection';
  assert not has_table_privilege('authenticated', 'public.reviews', 'INSERT'),
    'customer can bypass verified-review RPC';
  assert not has_table_privilege('authenticated', 'public.reviews', 'UPDATE'),
    'customer can self-moderate reviews';

  assert exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'orders_total_consistent'
  ), 'order total consistency constraint is missing';
  assert exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'payments_amount_nonnegative'
  ), 'payment amount constraint is missing';
  assert exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'reviews_rating_check'
  ), 'review rating constraint is missing';
  assert exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'shipments_tracking_url_valid'
  ), 'HTTPS tracking URL constraint is missing';
  assert exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'homepage_blocks_cta_href_check'
       or pg_get_constraintdef(oid) like '%cta_href%'
  ), 'safe homepage CTA constraint is missing';
  assert exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'inventory_quantity_nonnegative'
  ), 'non-negative inventory constraint is missing';
  assert exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'stock_reservations_order_inventory_unique'
  ), 'duplicate stock-reservation constraint is missing';
  assert exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'reviews_user_product_unique'
  ), 'duplicate review constraint is missing';

  assert (select public.is_admin()) = false,
    'missing JWT was treated as admin';
  assert has_function_privilege('authenticated', 'public.get_admin_dashboard_stats(timestamptz)', 'EXECUTE'),
    'authenticated admin entry point is unavailable';
  assert not has_function_privilege('anon', 'public.get_admin_dashboard_stats(timestamptz)', 'EXECUTE'),
    'anon can execute admin statistics RPC';
  assert has_function_privilege('authenticated', 'public.moderate_product_review(uuid,public.review_moderation_status)', 'EXECUTE'),
    'authenticated admin review entry point is unavailable';
  assert not has_function_privilege('anon', 'public.moderate_product_review(uuid,public.review_moderation_status)', 'EXECUTE'),
    'anon can execute review moderation RPC';

  assert (select count(*) = 4 from pg_catalog.pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'product_images_storage_admin_%'),
    'product image Storage policies are incomplete';
  assert exists (
    select 1 from storage.buckets
    where id = 'product-images'
      and public
      and file_size_limit = 5242880
      and allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
  ), 'product image bucket restrictions are incomplete';
end;
$$;

set local role anon;

do $$
begin
  begin
    perform 1 from public.profiles limit 1;
    assert false, 'anon profile read did not fail closed';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.next_order_public_number();
    assert false, 'anon order-number call did not fail closed';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '9a000000-0000-4000-8000-000000000001', true);

do $$
begin
  assert (select count(*) = 0 from public.profiles),
    'customer can read another profile';
  assert (select count(*) = 0 from public.customer_addresses),
    'customer can read another address';

  begin
    insert into public.user_roles (user_id, role)
    values ('9a000000-0000-4000-8000-000000000001', 'admin');
    assert false, 'customer role escalation did not fail closed';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.next_order_public_number();
    assert false, 'customer order-number call did not fail closed';
  exception when insufficient_privilege then null;
  end;
end;
$$;

rollback;
