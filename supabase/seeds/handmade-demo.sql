-- Operator-only seed, deliberately outside migrations. Run via scripts/demo-seed.mjs.
-- Two fictional products; no images, users, orders, reviews, or external calls.
do $$
declare n integer;
begin
 if current_setting('demo_seed.authorized_ref', true) is distinct from 'bfmihaxfleztajzyamio' then
  raise exception 'Use the explicitly targeted demo seed runner';
 end if;
 perform pg_advisory_xact_lock(102018, 1);
 lock table public.products, public.categories, public.product_categories, public.inventory in share row exclusive mode;
 if (select count(*) from supabase_migrations.schema_migrations) <> 29 then
  raise exception 'Expected reviewed 29-migration schema';
 end if;
 select count(*) into n from public.products where id in
 ('2d100000-0000-4000-8000-000000000001','2d100000-0000-4000-8000-000000000002');
 if n = 2 and exists (select 1 from public.categories where id='2d100000-0000-4000-8000-000000000003')
 and (select count(*)=2 from public.product_categories where category_id='2d100000-0000-4000-8000-000000000003'
 and product_id in ('2d100000-0000-4000-8000-000000000001','2d100000-0000-4000-8000-000000000002'))
 and (select count(*)=2 from public.inventory where id in
 ('2d100000-0000-4000-8000-000000000004','2d100000-0000-4000-8000-000000000005')) then
  -- Never reset edited product fields or consumed inventory on rerun.
  return;
 end if;
 if exists(select 1 from public.products) or exists(select 1 from public.categories)
 or exists(select 1 from public.collections) or exists(select 1 from public.inventory)
 or exists(select 1 from public.orders) or exists(select 1 from auth.users) then
  raise exception 'Refusing partial seed or non-empty installation; no overwrite';
 end if;
 insert into public.categories(id,name,slug,description) values
 ('2d100000-0000-4000-8000-000000000003','Colecția demonstrativă','demo-handmade','Date fictive pentru testare, nu ofertă comercială.');
 insert into public.products(id,name,slug,description,base_price,product_type,publication_status,availability_status) values
 ('2d100000-0000-4000-8000-000000000001','Cană demonstrativă','demo-cana','Produs fictiv pentru testarea magazinului. Nu reprezintă o ofertă comercială.',89,'standard','published','in_stock'),
 ('2d100000-0000-4000-8000-000000000002','Decorațiune demonstrativă','demo-decoratiune','Produs fictiv pentru testarea magazinului. Nu reprezintă o ofertă comercială.',49,'standard','published','in_stock');
 insert into public.product_categories(product_id,category_id) values
 ('2d100000-0000-4000-8000-000000000001','2d100000-0000-4000-8000-000000000003'),
 ('2d100000-0000-4000-8000-000000000002','2d100000-0000-4000-8000-000000000003');
 insert into public.inventory(id,product_id,quantity) values
 ('2d100000-0000-4000-8000-000000000004','2d100000-0000-4000-8000-000000000001',0),
 ('2d100000-0000-4000-8000-000000000005','2d100000-0000-4000-8000-000000000002',0);
 perform set_config('request.jwt.claim.role','service_role',true);
 perform public.adjust_inventory('2d100000-0000-4000-8000-000000000004',10,'Demo seed initial stock');
 perform public.adjust_inventory('2d100000-0000-4000-8000-000000000005',10,'Demo seed initial stock');
end;
$$;
