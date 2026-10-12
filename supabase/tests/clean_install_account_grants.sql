begin;

-- Disposable identities: never create persistent accounts for this check.
insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
values
 ('2d000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'grant-a@example.invalid', '{}', '{}'),
 ('2d000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'grant-b@example.invalid', '{}', '{}');
insert into public.customer_addresses
 (id, user_id, recipient_name, phone, address_line_1, city, county)
values ('2d000000-0000-4000-8000-000000000012', '2d000000-0000-4000-8000-000000000002',
 'Fixture B', '0700000000', 'Fixture street', 'Test', 'Test');

set local role authenticated;
select set_config('request.jwt.claim.sub', '2d000000-0000-4000-8000-000000000001', true);
do $$
declare n integer;
begin
 assert (select count(*) = 1 from public.profiles where id in
 ('2d000000-0000-4000-8000-000000000001','2d000000-0000-4000-8000-000000000002')),
 'profile ownership read failed';
 update public.profiles set first_name = 'Own' where id = '2d000000-0000-4000-8000-000000000001';
 get diagnostics n = row_count;
 assert n = 1, 'own profile update failed';
 update public.profiles set first_name = 'Forbidden' where id = '2d000000-0000-4000-8000-000000000002';
 get diagnostics n = row_count;
 assert n = 0, 'cross-user profile update allowed';
 assert (select count(*) = 1 from public.user_roles where user_id in
 ('2d000000-0000-4000-8000-000000000001','2d000000-0000-4000-8000-000000000002')),
 'role ownership read failed';
 begin
  insert into public.user_roles(user_id, role) values ('2d000000-0000-4000-8000-000000000001','admin');
  assert false, 'role escalation allowed';
 exception when insufficient_privilege then null;
 end;
 assert not exists (select 1 from public.customer_addresses where id = '2d000000-0000-4000-8000-000000000012'),
 'cross-user address visible';
 insert into public.customer_addresses(id,user_id,recipient_name,phone,address_line_1,city,county)
 values ('2d000000-0000-4000-8000-000000000011','2d000000-0000-4000-8000-000000000001','Own','0700000000','Test','Test','Test');
 update public.customer_addresses set city='Changed' where id='2d000000-0000-4000-8000-000000000011';
 get diagnostics n = row_count;
 assert n = 1, 'own address update failed';
 begin
  update public.customer_addresses set user_id='2d000000-0000-4000-8000-000000000002'
   where id='2d000000-0000-4000-8000-000000000011';
  assert false, 'address ownership transfer allowed';
 exception when insufficient_privilege then null;
 end;
 begin
  insert into public.customer_addresses(user_id,recipient_name,phone,address_line_1,city,county)
  values ('2d000000-0000-4000-8000-000000000002','Forbidden','0700000000','Test','Test','Test');
  assert false, 'cross-user address insert allowed';
 exception when insufficient_privilege then null;
 end;
 update public.customer_addresses set city='Forbidden' where id='2d000000-0000-4000-8000-000000000012';
 get diagnostics n = row_count;
 assert n = 0, 'cross-user address update allowed';
 delete from public.customer_addresses where id='2d000000-0000-4000-8000-000000000012';
 get diagnostics n = row_count;
 assert n = 0, 'cross-user address delete allowed';
 delete from public.customer_addresses where id='2d000000-0000-4000-8000-000000000011';
 get diagnostics n = row_count;
 assert n = 1, 'own address delete failed';
end;
$$;
reset role;
set local role service_role;
-- Exercise actual SELECT access, not just metadata flags.
select count(*) from public.orders where false;
select count(*) from public.order_items where false;
select count(*) from public.payments where false;
select count(*) from public.shipments where false;
select count(*) from public.stripe_webhook_events where false;
reset role;
rollback;
