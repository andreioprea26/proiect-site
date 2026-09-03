begin;

drop policy content_pages_public_select on public.content_pages;

create policy content_pages_public_select
on public.content_pages
for select
to anon, authenticated
using (status = 'published'::public.content_page_status);

create policy content_pages_admin_select
on public.content_pages
for select
to authenticated
using ((select public.is_admin()));

commit;
