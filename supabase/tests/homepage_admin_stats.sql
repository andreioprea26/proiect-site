begin;

do $$
declare
  v_admin uuid := '8c000000-0000-4000-8000-000000000001';
  v_customer uuid := '8c000000-0000-4000-8000-000000000002';
  v_result jsonb;
begin
  assert to_regclass('public.homepage_blocks') is not null, 'homepage blocks table missing';
  assert to_regprocedure('public.get_public_homepage_blocks()') is not null, 'public homepage RPC missing';
  assert to_regprocedure('public.upsert_homepage_block(public.homepage_block_slot,text,text,text,text,text,boolean,integer)') is not null, 'homepage admin RPC missing';
  assert to_regprocedure('public.get_admin_dashboard_stats(timestamp with time zone)') is not null, 'admin stats RPC missing';
  assert not has_table_privilege('anon', 'public.homepage_blocks', 'select'), 'anon can list homepage storage directly';
  assert not has_table_privilege('authenticated', 'public.homepage_blocks', 'insert'), 'authenticated can insert homepage directly';
  assert not has_table_privilege('authenticated', 'public.homepage_blocks', 'update'), 'authenticated can update homepage directly';
  assert has_function_privilege('anon', 'public.get_public_homepage_blocks()', 'execute'), 'anon cannot call public homepage RPC';
  assert not has_function_privilege('anon', 'public.get_admin_dashboard_stats(timestamp with time zone)', 'execute'), 'anon can execute admin stats RPC';

  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (v_admin, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-8c@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (v_customer, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'customer-8c@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());
  insert into public.user_roles (user_id, role) values (v_admin, 'admin');

  perform set_config('request.jwt.claim.sub', v_customer::text, true);
  v_result := public.upsert_homepage_block('hero', 'Atac', 'Titlu client', null, null, null, true, 0);
  assert v_result->>'code' = 'unauthorized', 'customer changed homepage through RPC';
  v_result := public.get_admin_dashboard_stats(now() - interval '30 days');
  assert v_result->>'code' = 'unauthorized', 'customer accessed admin statistics';

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  v_result := public.upsert_homepage_block('hero', 'Atelier 8C', 'Homepage administrabil 8C', 'Subtitlu sigur.', 'Vezi magazinul', '/shop?source=8c', true, 0);
  assert (v_result->>'success')::boolean, 'admin could not save active hero';
  v_result := public.upsert_homepage_block('promo', 'Promo 8C', 'Promo ascuns 8C', null, 'Detalii', '/custom-orders', false, 40);
  assert (v_result->>'success')::boolean, 'admin could not save inactive promo';
  v_result := public.upsert_homepage_block('categories', null, 'Categorii 8C', null, 'Atac', 'https://evil.example', true, 10);
  assert v_result->>'code' = 'invalid_request', 'external CTA was accepted';
  assert (select updated_by = v_admin from public.homepage_blocks where slot = 'hero'), 'admin actor was not recorded';
end;
$$;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  assert (select count(*) = 2 from public.get_public_homepage_blocks()), 'public homepage RPC omitted configured slots';
  assert (select title = 'Homepage administrabil 8C' from public.get_public_homepage_blocks() where slot = 'hero'), 'active homepage content is not public';
  assert (select not is_active and title is null and cta_href is null from public.get_public_homepage_blocks() where slot = 'promo'), 'inactive homepage content leaked';
  begin perform count(*) from public.homepage_blocks; assert false, 'anon selected homepage table'; exception when insufficient_privilege then null; end;
  begin perform public.get_admin_dashboard_stats(now()); assert false, 'anon executed admin stats'; exception when insufficient_privilege then null; end;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '8c000000-0000-4000-8000-000000000002', true);
do $$ begin
  assert (select count(*) = 0 from public.homepage_blocks), 'customer listed homepage administration rows';
  begin insert into public.homepage_blocks (slot, title) values ('products', 'Atac'); assert false, 'customer inserted homepage row'; exception when insufficient_privilege then null; end;
end $$;

reset role;
do $$
declare
  v_admin uuid := '8c000000-0000-4000-8000-000000000001';
  v_product uuid := '8c000000-0000-4000-8000-000000000010';
  v_shipping uuid := '8c000000-0000-4000-8000-000000000011';
  v_card_paid uuid := '8c000000-0000-4000-8000-000000000020';
  v_card_pending uuid := '8c000000-0000-4000-8000-000000000021';
  v_cod uuid := '8c000000-0000-4000-8000-000000000022';
  v_payment_paid uuid := '8c000000-0000-4000-8000-000000000030';
  v_payment_pending uuid := '8c000000-0000-4000-8000-000000000031';
  v_before jsonb;
  v_after jsonb;
  v_since timestamptz := now() - interval '30 days';
begin
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  v_before := public.get_admin_dashboard_stats(v_since);
  assert (v_before->>'success')::boolean, 'admin could not access statistics';

  insert into public.shipping_methods (id, code, name, price_minor, is_active)
  values (v_shipping, 'curier-8c', 'Curier 8C', 0, false);
  insert into public.products (id, name, slug, base_price, product_type, publication_status, availability_status)
  values (v_product, 'Produs 8C', 'produs-8c-statistici', 100, 'standard', 'draft', 'in_stock');

  insert into public.orders (id, idempotency_key, request_fingerprint, email, phone, customer_type, shipping_address, billing_address, shipping_method_id, shipping_method_code, shipping_method_name, payment_method, payment_status, status, subtotal_minor, shipping_minor, total_minor, currency)
  values
    (v_card_paid, '8c000000-0000-4000-8000-000000000040', '{}', 'card-paid-8c@example.com', '0700000001', 'individual', '{}', '{}', v_shipping, 'curier-8c', 'Curier 8C', 'card', 'paid', 'paid', 10000, 0, 10000, 'RON'),
    (v_card_pending, '8c000000-0000-4000-8000-000000000041', '{}', 'card-pending-8c@example.com', '0700000002', 'individual', '{}', '{}', v_shipping, 'curier-8c', 'Curier 8C', 'card', 'pending', 'awaiting_payment', 7000, 0, 7000, 'RON'),
    (v_cod, '8c000000-0000-4000-8000-000000000042', '{}', 'cod-8c@example.com', '0700000003', 'individual', '{}', '{}', v_shipping, 'curier-8c', 'Curier 8C', 'cash_on_delivery', 'paid', 'shipped', 5000, 0, 5000, 'RON');

  insert into public.payments (id, order_id, provider, status, amount_minor, currency, idempotency_key, pending_expires_at, provider_payment_id, paid_at)
  values
    (v_payment_paid, v_card_paid, 'stripe', 'paid', 10000, 'RON', '8c000000-0000-4000-8000-000000000050', now() + interval '1 hour', 'pi_8c_paid', now()),
    (v_payment_pending, v_card_pending, 'stripe', 'pending', 7000, 'RON', '8c000000-0000-4000-8000-000000000051', now() + interval '1 hour', null, null);
  insert into public.payment_refunds (payment_id, provider_refund_id, provider_payment_intent_id, amount_minor, currency, status, idempotency_key, succeeded_at)
  values (v_payment_paid, 're_8c_success', 'pi_8c_paid', 2000, 'RON', 'succeeded', 'refund-8c-success', now());

  update public.cod_collections set status = 'collected', collected_at = now(), collected_by = v_admin, collection_request_id = '8c000000-0000-4000-8000-000000000060'
  where order_id = v_cod;
  insert into public.reviews (product_id, user_id, rating, review_text, verified_purchase, status, author_display_name)
  values (v_product, v_admin, 5, 'Review 8C în așteptare.', true, 'pending', 'Admin 8C');
  insert into public.contact_requests (name, email, category, message, submission_key)
  values ('Client 8C', 'contact-8c@example.com', 'general', 'Mesaj suficient de lung pentru statistica 8C.', 'contact-8c-stat');
  insert into public.custom_order_requests (name, email, description, submission_key)
  values ('Client 8C', 'custom-8c@example.com', 'Descriere suficient de lungă pentru cererea personalizată 8C.', 'custom-8c-stat');
  insert into public.newsletter_subscribers (email, source)
  values ('newsletter-8c@example.com', 'homepage');

  v_after := public.get_admin_dashboard_stats(v_since);
  assert (v_after->>'recentOrderCount')::bigint = (v_before->>'recentOrderCount')::bigint + 3, 'recent order count is incorrect';
  assert (v_after->>'attentionOrderCount')::bigint = (v_before->>'attentionOrderCount')::bigint + 1, 'attention order count is incorrect';
  assert (v_after->>'stripeCollectedGrossMinor')::bigint = (v_before->>'stripeCollectedGrossMinor')::bigint + 10000, 'Stripe gross includes pending or misses paid';
  assert (v_after->>'codCollectedMinor')::bigint = (v_before->>'codCollectedMinor')::bigint + 5000, 'COD collected is incorrect';
  assert (v_after->>'successfulRefundsMinor')::bigint = (v_before->>'successfulRefundsMinor')::bigint + 2000, 'successful refunds are incorrect';
  assert (v_after->>'stripeCollectedNetMinor')::bigint = (v_before->>'stripeCollectedNetMinor')::bigint + 8000, 'Stripe net is incorrect';
  assert (v_after->>'pendingReviewCount')::bigint = (v_before->>'pendingReviewCount')::bigint + 1, 'pending reviews count is incorrect';
  assert (v_after->>'newContactCount')::bigint = (v_before->>'newContactCount')::bigint + 1, 'new contacts count is incorrect';
  assert (v_after->>'newCustomRequestCount')::bigint = (v_before->>'newCustomRequestCount')::bigint + 1, 'new custom requests count is incorrect';
  assert (v_after->>'activeSubscriberCount')::bigint = (v_before->>'activeSubscriberCount')::bigint + 1, 'active subscribers count is incorrect';
  assert ((v_after->'ordersByStatus'->>'awaiting_payment')::bigint = coalesce((v_before->'ordersByStatus'->>'awaiting_payment')::bigint, 0) + 1), 'orders by status is incorrect';
end;
$$;

rollback;
