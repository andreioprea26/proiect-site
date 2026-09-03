begin;

do $$
declare
  v_admin uuid := '8a000000-0000-4000-8000-000000000001';
  v_customer_a uuid := '8a000000-0000-4000-8000-000000000002';
  v_customer_b uuid := '8a000000-0000-4000-8000-000000000003';
  v_product uuid := '8a000000-0000-4000-8000-000000000010';
  v_shipping uuid := '8a000000-0000-4000-8000-000000000011';
  v_order_a uuid := '8a000000-0000-4000-8000-000000000020';
  v_order_b uuid := '8a000000-0000-4000-8000-000000000021';
  v_result jsonb;
begin
  assert to_regclass('public.favorites') is not null, 'favorites table is missing';
  assert to_regclass('public.reviews') is not null, 'reviews table is missing';
  assert to_regclass('public.review_moderation_events') is not null,
    'review moderation audit is missing';
  assert to_regprocedure('public.submit_verified_review(uuid,integer,text)') is not null,
    'review submission RPC is missing';
  assert to_regprocedure('public.get_approved_product_reviews(uuid)') is not null,
    'public approved review RPC is missing';
  assert not has_table_privilege('authenticated', 'public.reviews', 'insert'),
    'client can bypass review eligibility with direct insert';
  assert not has_table_privilege('authenticated', 'public.reviews', 'update'),
    'client can self-moderate with direct update';
  assert not has_table_privilege('anon', 'public.reviews', 'select'),
    'anonymous role can read private review rows';

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values
    (v_admin, '00000000-0000-0000-0000-000000000000', 'authenticated',
      'authenticated', 'admin-8a@example.com', '', now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (v_customer_a, '00000000-0000-0000-0000-000000000000', 'authenticated',
      'authenticated', 'customer-a-8a@example.com', '', now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (v_customer_b, '00000000-0000-0000-8000-000000000000', 'authenticated',
      'authenticated', 'customer-b-8a@example.com', '', now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now());
  insert into public.user_roles (user_id, role) values (v_admin, 'admin');
  update public.profiles set first_name = 'Ana', last_name = 'Popescu'
  where id = v_customer_a;

  insert into public.products (
    id, name, slug, base_price, product_type,
    publication_status, availability_status
  ) values (
    v_product, 'Produs review 8A', 'produs-review-8a', 50,
    'standard', 'published', 'in_stock'
  );
  insert into public.shipping_methods (id, code, name, price_minor)
  values (v_shipping, 'curier-8a', 'Curier 8A', 1000);
  insert into public.orders (
    id, idempotency_key, request_fingerprint, user_id, email, phone,
    customer_type, shipping_address, billing_address, shipping_method_id,
    shipping_method_code, shipping_method_name, payment_method,
    payment_status, status, subtotal_minor, shipping_minor, total_minor
  ) values
    (v_order_a, '8a000000-0000-4000-8000-000000000030', '{}', v_customer_a,
      'customer-a-8a@example.com', '0700000001', 'individual',
      '{"recipientName":"Ana"}', '{"recipientName":"Ana"}', v_shipping,
      'curier-8a', 'Curier 8A', 'card', 'paid', 'completed', 5000, 1000, 6000),
    (v_order_b, '8a000000-0000-4000-8000-000000000031', '{}', v_customer_b,
      'customer-b-8a@example.com', '0700000002', 'individual',
      '{"recipientName":"Bogdan"}', '{"recipientName":"Bogdan"}', v_shipping,
      'curier-8a', 'Curier 8A', 'card', 'pending', 'awaiting_payment', 5000, 1000, 6000);
  insert into public.order_items (
    order_id, product_id, product_name, product_slug,
    unit_base_price_minor, customization_total_minor,
    unit_price_minor, quantity, line_subtotal_minor
  ) values
    (v_order_a, v_product, 'Snapshot produs 8A', 'produs-review-8a',
      5000, 0, 5000, 1, 5000),
    (v_order_b, v_product, 'Snapshot produs 8A', 'produs-review-8a',
      5000, 0, 5000, 1, 5000);

  perform set_config('request.jwt.claim.sub', v_customer_a::text, true);
  assert public.can_review_product(v_product),
    'paid completed owner is not review eligible';
  v_result := public.submit_verified_review(v_product, 5, 'Un produs foarte frumos lucrat.');
  assert (v_result->>'success')::boolean, 'eligible review was rejected';
  assert (select status = 'pending' and verified_purchase
    from public.reviews where id = (v_result->>'reviewId')::uuid),
    'submitted review is not verified and pending';
  assert (select author_display_name = 'Ana P.'
    from public.reviews where id = (v_result->>'reviewId')::uuid),
    'safe public author name was not snapshotted';
  assert (select count(*) = 0 from public.get_approved_product_reviews(v_product)),
    'pending review leaked through public RPC';
  v_result := public.submit_verified_review(v_product, 4, 'A doua recenzie nepermisă.');
  assert v_result->>'code' = 'duplicate_review', 'duplicate review was accepted';

  perform set_config('request.jwt.claim.sub', v_customer_b::text, true);
  assert not public.can_review_product(v_product),
    'pending unpaid order became review eligible';
  v_result := public.submit_verified_review(v_product, 5, 'Recenzie fără achiziție eligibilă.');
  assert v_result->>'code' = 'not_eligible', 'ineligible review was accepted';
  v_result := public.moderate_product_review(
    (select id from public.reviews where user_id = v_customer_a), 'approved'
  );
  assert v_result->>'code' = 'unauthorized', 'customer moderated a review';

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  v_result := public.moderate_product_review(
    (select id from public.reviews where user_id = v_customer_a), 'approved'
  );
  assert (v_result->>'success')::boolean, 'admin approval failed';
  assert (select count(*) = 1 from public.review_moderation_events),
    'review moderation was not audited';
  assert (select count(*) = 1 from public.get_approved_product_reviews(v_product)),
    'approved review is absent from public RPC';
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '8a000000-0000-4000-8000-000000000002', true);

do $$
begin
  assert (select count(*) = 1 from public.orders),
    'customer order RLS did not isolate owned orders';
  insert into public.favorites (user_id, product_id) values (
    '8a000000-0000-4000-8000-000000000002',
    '8a000000-0000-4000-8000-000000000010'
  );
  assert (select count(*) = 1 from public.favorites),
    'customer cannot read own favorite';
  begin
    insert into public.favorites (user_id, product_id) values (
      '8a000000-0000-4000-8000-000000000002',
      '8a000000-0000-4000-8000-000000000010'
    );
    assert false, 'duplicate favorite was accepted';
  exception when unique_violation then null;
  end;
  begin
    insert into public.favorites (user_id, product_id) values (
      '8a000000-0000-4000-8000-000000000003',
      '8a000000-0000-4000-8000-000000000010'
    );
    assert false, 'customer inserted a favorite for another user';
  exception when insufficient_privilege then null;
  end;
  delete from public.favorites where product_id = '8a000000-0000-4000-8000-000000000010';
  assert (select count(*) = 0 from public.favorites), 'favorite removal failed';
end;
$$;

rollback;
