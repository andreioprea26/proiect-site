begin;

-- Authenticated users may read only their own role rows. RLS continues to
-- reject inserts, updates, and deletes because no policies exist for them.
create policy user_roles_select_own
on public.user_roles
for select
to authenticated
using ((select auth.uid()) = user_id);

commit;
