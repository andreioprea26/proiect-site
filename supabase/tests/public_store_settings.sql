begin;
create temporary table settings_assertions(label text);
create function pg_temp.check_setting(ok boolean, label text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if ok is distinct from true then raise exception 'FAIL: %', label; end if;
  insert into pg_temp.settings_assertions values(label);
end $$;
select pg_temp.check_setting(to_regclass('public.store_settings') is not null, 'table exists');
select pg_temp.check_setting((select relrowsecurity from pg_class where oid='public.store_settings'::regclass), 'RLS enabled');
select pg_temp.check_setting((select count(*) = 1 from public.store_settings), 'singleton initialized');
select pg_temp.check_setting((select array_agg(column_name::text order by column_name) = array['display_name','facebook_url','footer_description','instagram_url','public_email','public_phone','seo_description','short_description','singleton','tagline','tiktok_url','updated_at','updated_by','whatsapp'] from information_schema.columns where table_schema='public' and table_name='store_settings'), 'explicit schema contains no secret/infrastructure columns');
select pg_temp.check_setting((select proconfig @> array['search_path=""'] from pg_proc where oid='public.save_store_settings(text,text,text,text,text,text,text,text,text,text,text)'::regprocedure), 'safe admin search_path');
select pg_temp.check_setting((select proconfig @> array['search_path=""'] from pg_proc where oid='public.get_public_store_settings()'::regprocedure), 'safe public search_path');
select pg_temp.check_setting(not has_table_privilege('anon','public.store_settings','INSERT'), 'anon lacks INSERT');
select pg_temp.check_setting(not has_table_privilege('anon','public.store_settings','UPDATE'), 'anon lacks UPDATE');
select pg_temp.check_setting(not has_table_privilege('anon','public.store_settings','DELETE'), 'anon lacks DELETE');
select pg_temp.check_setting(not has_table_privilege('anon','public.store_settings','TRUNCATE'), 'anon lacks TRUNCATE');
select pg_temp.check_setting(has_function_privilege('anon','public.get_public_store_settings()','execute'), 'anon can read public RPC');
select pg_temp.check_setting(not has_function_privilege('anon','public.valid_store_setting(text,text)','execute'), 'anon cannot execute private validator');
select pg_temp.check_setting(not has_table_privilege('authenticated','public.store_settings','INSERT'), 'authenticated lacks INSERT');
select pg_temp.check_setting(not has_table_privilege('authenticated','public.store_settings','UPDATE'), 'authenticated lacks UPDATE');
select pg_temp.check_setting(not has_table_privilege('authenticated','public.store_settings','DELETE'), 'authenticated lacks DELETE');
select pg_temp.check_setting(not has_table_privilege('authenticated','public.store_settings','TRUNCATE'), 'authenticated lacks TRUNCATE');
select pg_temp.check_setting(has_function_privilege('authenticated','public.get_public_store_settings()','execute'), 'authenticated can read public RPC');
select pg_temp.check_setting(not has_function_privilege('authenticated','public.valid_store_setting(text,text)','execute'), 'authenticated cannot execute private validator');
select pg_temp.check_setting(not has_function_privilege('anon','public.save_store_settings(text,text,text,text,text,text,text,text,text,text,text)','execute'), 'anon/PUBLIC cannot save');
select pg_temp.check_setting(has_function_privilege('authenticated','public.save_store_settings(text,text,text,text,text,text,text,text,text,text,text)','execute'), 'authenticated can reach authorization gate');

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
('10b20000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','settings-admin@example.com','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now()),
('10b20000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','settings-customer@example.com','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now());
insert into public.user_roles(user_id,role) values ('10b20000-0000-4000-8000-000000000001','admin');

set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  begin update public.store_settings set display_name='Attack'; raise exception 'anon direct write accepted'; exception when insufficient_privilege then perform pg_temp.check_setting(true,'anon direct update refused'); end;
  begin perform * from public.store_settings; raise exception 'anon direct read accepted'; exception when insufficient_privilege then perform pg_temp.check_setting(true,'anon direct table read refused'); end;
  begin perform public.save_store_settings(null, null, null, null, null, null, null, null, null, null, null); raise exception 'anon RPC accepted'; exception when insufficient_privilege then perform pg_temp.check_setting(true,'anon save RPC refused'); end;
end $$;
select pg_temp.check_setting((select count(*)=1 from public.get_public_store_settings()), 'anon public read works');
select pg_temp.check_setting((select array_agg(key order by key) = array['display_name','facebook_url','footer_description','instagram_url','public_email','public_phone','seo_description','short_description','tagline','tiktok_url','whatsapp'] from jsonb_object_keys((select to_jsonb(s) from public.get_public_store_settings() s)) key), 'public read exact allowlist excludes audit columns');

set local role authenticated;
select set_config('request.jwt.claim.sub','10b20000-0000-4000-8000-000000000002',true);
select pg_temp.check_setting((select count(*)=0 from public.store_settings),'RLS hides internal row from customer');
select pg_temp.check_setting(public.save_store_settings('Attack', null, null, null, null, null, null, null, null, null, null)->>'code'='unauthorized','customer RPC refused');
do $$ begin
  begin update public.store_settings set display_name='Attack'; raise exception 'customer direct write accepted'; exception when insufficient_privilege then perform pg_temp.check_setting(true,'customer direct update refused'); end;
  begin insert into public.store_settings(singleton) values(false); raise exception 'customer insert accepted'; exception when insufficient_privilege then perform pg_temp.check_setting(true,'customer insert refused'); end;
end $$;
select set_config('request.jwt.claim.sub','10b20000-0000-4000-8000-000000000001',true);
select pg_temp.check_setting((select count(*)=1 from public.store_settings),'admin reads row through RLS');
select pg_temp.check_setting((public.save_store_settings('  Magazin SQL  ', null, null, null, null, 'public@example.com', '+40700000000', '+40700000000', 'https://www.instagram.com/demo', null, null)->>'success')::boolean,'admin save succeeds');
select pg_temp.check_setting((select display_name='Magazin SQL' and public_email='public@example.com' from public.get_public_store_settings()),'save trims and publishes');
select pg_temp.check_setting((select updated_by='10b20000-0000-4000-8000-000000000001'::uuid from public.store_settings),'admin actor recorded');
select pg_temp.check_setting(public.save_store_settings('<script>alert(1)</script>', null, null, null, null, null, null, null, null, null, null)->>'code'='invalid_request','reject display_name: <script>alert(1)</script>');
select pg_temp.check_setting(public.save_store_settings('xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', null, null, null, null, null, null, null, null, null, null)->>'code'='invalid_request','reject display_name: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
select pg_temp.check_setting(public.save_store_settings(null, null, null, null, null, 'invalid', null, null, null, null, null)->>'code'='invalid_request','reject public_email: invalid');
select pg_temp.check_setting(public.save_store_settings(null, null, null, null, null, null, 'https://evil.example', null, null, null, null)->>'code'='invalid_request','reject public_phone: https://evil.example');
select pg_temp.check_setting(public.save_store_settings(null, null, null, null, null, null, null, 'call me', null, null, null)->>'code'='invalid_request','reject whatsapp: call me');
select pg_temp.check_setting(public.save_store_settings(null, null, null, null, null, null, null, null, 'http://instagram.com/demo', null, null)->>'code'='invalid_request','reject instagram_url: http://instagram.com/demo');
select pg_temp.check_setting(public.save_store_settings(null, null, null, null, null, null, null, null, 'javascript:alert(1)', null, null)->>'code'='invalid_request','reject instagram_url: javascript:alert(1)');
select pg_temp.check_setting(public.save_store_settings(null, null, null, null, null, null, null, null, 'data:text/html,x', null, null)->>'code'='invalid_request','reject instagram_url: data:text/html,x');
select pg_temp.check_setting(public.save_store_settings(null, null, null, null, null, null, null, null, 'https://instagram.com.evil.example/demo', null, null)->>'code'='invalid_request','reject instagram_url: https://instagram.com.evil.example/demo');
select pg_temp.check_setting(public.save_store_settings(null, null, null, null, null, null, null, null, 'https://evil.example', null, null)->>'code'='invalid_request','reject instagram_url: https://evil.example');
select pg_temp.check_setting(public.save_store_settings(null, null, null, null, null, null, null, null, 'https://user@instagram.com/demo', null, null)->>'code'='invalid_request','reject instagram_url: https://user@instagram.com/demo');
select pg_temp.check_setting(public.save_store_settings(null, null, null, null, null, null, null, null, 'https://instagram.com:443/demo', null, null)->>'code'='invalid_request','reject instagram_url: https://instagram.com:443/demo');
select pg_temp.check_setting(public.save_store_settings(null, null, null, null, null, null, null, null, 'https://instagram.com/demo?next=evil', null, null)->>'code'='invalid_request','reject instagram_url: https://instagram.com/demo?next=evil');
select pg_temp.check_setting(public.save_store_settings(null, null, null, null, null, null, null, null, 'https://instagram.com/%2f%2fevil', null, null)->>'code'='invalid_request','reject instagram_url: https://instagram.com/%2f%2fevil');
select pg_temp.check_setting((select display_name='Magazin SQL' from public.store_settings),'invalid requests did not mutate');
select pg_temp.check_setting((public.save_store_settings('   ', '  ', null, null, null, null, null, null, null, null, null)->>'success')::boolean,'empty save allowed');
select pg_temp.check_setting((select display_name is null and tagline is null from public.get_public_store_settings()),'empty clears overrides');
reset role;
do $$ begin
  begin insert into public.store_settings(singleton) values(false); raise exception 'second singleton accepted'; exception when check_violation then perform pg_temp.check_setting(true,'singleton check refuses false'); end;
  begin insert into public.store_settings(singleton) values(true); raise exception 'duplicate singleton accepted'; exception when unique_violation then perform pg_temp.check_setting(true,'singleton duplicate refused'); end;
  begin update public.store_settings set display_name='<b>bad</b>'; raise exception 'constraint bypass accepted'; exception when check_violation then perform pg_temp.check_setting(true,'DB constraint rejects unsafe direct privileged write'); end;
end $$;
select count(*) as assertions_passed from settings_assertions;
rollback;
