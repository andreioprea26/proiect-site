-- Explicit opt-in demo transport, no carrier API or real shipping purchase.
do $$
begin
 if current_setting('demo_seed.authorized_ref', true) is distinct from 'bfmihaxfleztajzyamio' then
  raise exception 'Use the explicitly targeted demo seed runner';
 end if;
 perform pg_advisory_xact_lock(102018, 1);
 lock table public.shipping_methods in share row exclusive mode;
 if (select count(*) from supabase_migrations.schema_migrations) <> 29
 or (select count(*) from public.products where id in
 ('2d100000-0000-4000-8000-000000000001','2d100000-0000-4000-8000-000000000002')) <> 2 then
  raise exception 'Reviewed schema and catalog seed required';
 end if;
 if exists(select 1 from public.shipping_methods where id='2d100000-0000-4000-8000-000000000006'
 and code='demo-standard') then return; end if;
 if exists(select 1 from public.shipping_methods) or exists(select 1 from public.orders) then
  raise exception 'Refusing existing shipping configuration or commercial data';
 end if;
 insert into public.shipping_methods(id,code,name,description,price_minor,is_active)
 values ('2d100000-0000-4000-8000-000000000006','demo-standard','Livrare demonstrativă — fără curier real',
 'Tarif fictiv pentru testare. Nu generează transport sau AWB.',1990,true);
end;
$$;
