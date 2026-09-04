begin;

-- Administrative RPCs already reject non-admin callers internally. Removing the
-- inherited anon EXECUTE privilege also keeps them outside the anonymous API surface.
revoke all on function public.manage_newsletter_subscription(uuid, boolean) from anon;
revoke all on function public.manage_contact_request(uuid, public.contact_request_status, text) from anon;
revoke all on function public.manage_custom_order_request(uuid, public.custom_request_status, text) from anon;
revoke all on function public.upsert_content_page(uuid, text, text, text, public.content_page_status) from anon;

-- Order numbers are assigned by trusted database functions/defaults. Browser roles
-- never need to call the sequence-backed generator and must not be able to burn IDs.
revoke all on function public.next_order_public_number() from anon, authenticated;
grant execute on function public.next_order_public_number() to service_role;

-- Account PII has RLS already; these grants make the API surface least-privilege too.
revoke all on table public.profiles, public.user_roles, public.customer_addresses from anon;
revoke insert, delete, truncate, references, trigger on table public.profiles from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.user_roles from authenticated;
revoke truncate, references, trigger on table public.customer_addresses from authenticated;

commit;
