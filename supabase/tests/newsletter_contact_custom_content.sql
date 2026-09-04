begin;

do $$
declare
  v_admin uuid := '8b000000-0000-4000-8000-000000000001';
  v_customer uuid := '8b000000-0000-4000-8000-000000000002';
  v_contact uuid;
  v_custom uuid;
  v_result jsonb;
  v_consented_at timestamptz;
begin
  assert to_regclass('public.newsletter_subscribers') is not null, 'newsletter table missing';
  assert to_regclass('public.contact_requests') is not null, 'contact table missing';
  assert to_regclass('public.custom_order_requests') is not null, 'custom request table missing';
  assert to_regclass('public.content_pages') is not null, 'content table missing';
  assert to_regprocedure('public.subscribe_newsletter(text,text)') is not null, 'newsletter RPC missing';
  assert to_regprocedure('public.submit_contact_request(text,text,text,text)') is not null, 'contact RPC missing';
  assert to_regprocedure('public.submit_custom_order_request(text,text,text,integer,date)') is not null, 'custom RPC missing';
  assert not has_table_privilege('anon', 'public.newsletter_subscribers', 'select'), 'anon can list newsletter';
  assert not has_table_privilege('anon', 'public.contact_requests', 'select'), 'anon can list contacts';
  assert not has_table_privilege('anon', 'public.custom_order_requests', 'select'), 'anon can list custom requests';
  assert not has_table_privilege('authenticated', 'public.contact_requests', 'update'), 'customer can update contacts directly';
  assert not has_table_privilege('authenticated', 'public.custom_order_requests', 'update'), 'customer can update custom requests directly';
  assert not has_table_privilege('authenticated', 'public.content_pages', 'update'), 'customer can update content directly';
  assert not has_table_privilege('anon', 'public.newsletter_subscribers', 'insert'), 'anon can insert newsletter directly';
  assert not has_table_privilege('anon', 'public.contact_requests', 'insert'), 'anon can insert contacts directly';
  assert not has_table_privilege('anon', 'public.custom_order_requests', 'insert'), 'anon can insert custom requests directly';

  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (v_admin, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-8b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (v_customer, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'customer-8b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());
  insert into public.user_roles (user_id, role) values (v_admin, 'admin');

  perform set_config('request.jwt.claim.sub', v_customer::text, true);
  v_result := public.subscribe_newsletter('  CLIENT-8B@Example.COM ', 'footer');
  assert (v_result->>'success')::boolean, 'newsletter subscribe failed';
  v_result := public.subscribe_newsletter('client-8b@example.com', 'homepage');
  assert (v_result->>'success')::boolean, 'newsletter replay failed';
  assert (select count(*) = 1 from public.newsletter_subscribers where email = 'client-8b@example.com'), 'newsletter normalization or dedupe failed';
  assert (select user_id = v_customer and is_active and consented_at is not null and subscribed_at is not null from public.newsletter_subscribers where email = 'client-8b@example.com'), 'newsletter consent evidence or user link missing';

  v_result := public.submit_contact_request('Client Test', ' Client-8B@Example.com ', 'general', 'Mesaj de contact suficient de lung pentru test.');
  assert (v_result->>'success')::boolean, 'contact submission failed';
  v_result := public.submit_contact_request('Client Test', 'client-8b@example.com', 'general', 'Mesaj de contact suficient de lung pentru test.');
  assert (select count(*) = 1 from public.contact_requests), 'contact dedupe failed';
  select id into v_contact from public.contact_requests limit 1;
  assert (select user_id = v_customer and status = 'new' and internal_note is null from public.contact_requests where id = v_contact), 'contact defaults or user link invalid';

  v_result := public.submit_custom_order_request('Client Test', 'client-8b@example.com', 'Doresc o creație personalizată, albastră, pentru aniversare.', 25000, current_date + 30);
  assert (v_result->>'success')::boolean, 'custom request submission failed';
  select id into v_custom from public.custom_order_requests limit 1;
  assert (select user_id = v_customer and status = 'new' and budget_minor = 25000 from public.custom_order_requests where id = v_custom), 'custom request defaults invalid';
  assert (select count(*) = 0 from public.orders where email = 'client-8b@example.com'), 'custom request created an order';

  insert into public.content_pages (slug, title, content, status, published_at) values
    ('draft-8b', 'Draft 8B', 'Conținutul draft nu este public.', 'draft', null),
    ('published-8b', 'Publicat 8B', 'Conținut informativ public.', 'published', now());

  v_result := public.manage_contact_request(v_contact, 'closed', 'notă interzisă');
  assert v_result->>'code' = 'unauthorized', 'customer managed contact status';
  v_result := public.manage_custom_order_request(v_custom, 'accepted', 'notă interzisă');
  assert v_result->>'code' = 'unauthorized', 'customer accepted own custom request';

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  select consented_at into v_consented_at from public.newsletter_subscribers limit 1;
  v_result := public.manage_newsletter_subscription((select id from public.newsletter_subscribers limit 1), false);
  assert (v_result->>'success')::boolean, 'admin newsletter update failed';
  assert (select not is_active and unsubscribed_at is not null from public.newsletter_subscribers limit 1), 'newsletter inactive timestamps invalid';
  v_result := public.manage_newsletter_subscription((select id from public.newsletter_subscribers limit 1), true);
  assert (select is_active and unsubscribed_at is null and consented_at = v_consented_at from public.newsletter_subscribers limit 1), 'admin status change falsified consent evidence';
  v_result := public.manage_contact_request(v_contact, 'in_progress', 'Notă internă contact');
  assert (v_result->>'success')::boolean, 'admin contact update failed';
  assert (select status = 'in_progress' and internal_note = 'Notă internă contact' from public.contact_requests where id = v_contact), 'contact admin values missing';
  v_result := public.manage_custom_order_request(v_custom, 'accepted', 'Notă internă ofertă');
  assert (v_result->>'success')::boolean, 'admin custom update failed';
  assert (select status = 'accepted' and internal_note = 'Notă internă ofertă' from public.custom_order_requests where id = v_custom), 'custom admin values missing';
  v_result := public.upsert_content_page(null, 'faq-8b', 'FAQ 8B', 'Răspuns informativ sigur.', 'published');
  assert (v_result->>'success')::boolean, 'admin content create failed';
end;
$$;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  assert (select count(*) = 2 from public.content_pages), 'anon cannot see exactly the published pages';
  begin perform count(*) from public.newsletter_subscribers; assert false, 'anon listed newsletter'; exception when insufficient_privilege then null; end;
  begin perform count(*) from public.contact_requests; assert false, 'anon listed contacts'; exception when insufficient_privilege then null; end;
  begin perform count(*) from public.custom_order_requests; assert false, 'anon listed custom requests'; exception when insufficient_privilege then null; end;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '8b000000-0000-4000-8000-000000000002', true);
do $$ begin
  assert (select count(*) = 0 from public.newsletter_subscribers), 'customer listed newsletter';
  assert (select count(*) = 0 from public.contact_requests), 'customer listed contacts';
  assert (select count(*) = 0 from public.custom_order_requests), 'customer listed custom requests';
  assert (select count(*) = 2 from public.content_pages), 'customer content visibility differs from public';
  begin update public.content_pages set title = 'Atac' where slug = 'published-8b'; assert false, 'customer updated content'; exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub', '8b000000-0000-4000-8000-000000000001', true);
do $$ begin
  assert (select count(*) = 1 from public.newsletter_subscribers), 'admin cannot list newsletter';
  assert (select count(*) = 1 from public.contact_requests), 'admin cannot list contacts';
  assert (select count(*) = 1 from public.custom_order_requests), 'admin cannot list custom requests';
  assert (select count(*) = 3 from public.content_pages), 'admin cannot see draft and published content';
end $$;

rollback;
