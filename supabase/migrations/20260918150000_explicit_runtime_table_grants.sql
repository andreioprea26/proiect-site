begin;

-- Clean projects may disable automatic table grants. Policies alone do not
-- grant access. Retain the existing ownership RLS and account hardening.
grant select, update on table public.profiles to authenticated;
grant select on table public.user_roles to authenticated;
grant select, insert, update, delete on table public.customer_addresses to authenticated;

-- Only direct server reads present in checkout/card-server, email/notifications,
-- stripe/admin-cancellation and the webhook handler. Writes remain behind the
-- existing SECURITY DEFINER RPCs. No blanket/default privileges, no sequences,
-- no service-role catalog/Settings writes merely to accommodate test fixtures.
grant select on table public.orders, public.order_items, public.payments,
  public.shipments, public.stripe_webhook_events to service_role;

commit;
