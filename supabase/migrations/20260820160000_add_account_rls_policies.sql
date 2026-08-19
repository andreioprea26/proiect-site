begin;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy customer_addresses_select_own
on public.customer_addresses
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy customer_addresses_insert_own
on public.customer_addresses
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy customer_addresses_update_own
on public.customer_addresses
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy customer_addresses_delete_own
on public.customer_addresses
for delete
to authenticated
using ((select auth.uid()) = user_id);

commit;
