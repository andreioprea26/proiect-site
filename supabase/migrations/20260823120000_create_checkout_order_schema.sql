begin;

create type public.checkout_customer_type as enum (
  'individual',
  'company'
);

create type public.order_status as enum (
  'new',
  'awaiting_payment',
  'paid',
  'awaiting_customization_review',
  'in_progress',
  'ready',
  'shipped',
  'completed',
  'cancelled',
  'refunded',
  'returned'
);

create type public.order_payment_method as enum (
  'cash_on_delivery',
  'card'
);

create type public.order_payment_status as enum (
  'unpaid',
  'pending',
  'paid',
  'refunded'
);

create table public.shipping_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique
    constraint shipping_methods_code_format
    check (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null
    constraint shipping_methods_name_valid
    check (name = btrim(name) and name <> ''),
  description text,
  price_minor bigint not null
    constraint shipping_methods_price_nonnegative
    check (price_minor >= 0),
  is_active boolean not null default true,
  display_order integer not null default 0
    constraint shipping_methods_display_order_nonnegative
    check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence public.order_public_number_seq;

create function public.next_order_public_number()
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  select 'CMD-' || to_char(current_date, 'YYYY') || '-' ||
    lpad(nextval('public.order_public_number_seq')::text, 8, '0');
$$;

revoke all on function public.next_order_public_number() from public, anon, authenticated;
grant execute on function public.next_order_public_number() to authenticated;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  public_number text not null unique default public.next_order_public_number(),
  idempotency_key uuid not null unique,
  user_id uuid references auth.users (id) on delete set null,
  email text not null
    constraint orders_email_valid
    check (
      email = lower(btrim(email))
      and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      and length(email) <= 254
    ),
  phone text not null
    constraint orders_phone_valid
    check (phone = btrim(phone) and phone <> '' and length(phone) <= 30),
  customer_type public.checkout_customer_type not null,
  company_name text,
  company_tax_id text,
  company_registration_number text,
  shipping_address jsonb not null
    constraint orders_shipping_address_object
    check (jsonb_typeof(shipping_address) = 'object'),
  billing_same_as_shipping boolean not null default true,
  billing_address jsonb not null
    constraint orders_billing_address_object
    check (jsonb_typeof(billing_address) = 'object'),
  shipping_method_id uuid references public.shipping_methods (id) on delete set null,
  shipping_method_code text not null,
  shipping_method_name text not null,
  payment_method public.order_payment_method not null,
  payment_status public.order_payment_status not null default 'unpaid',
  status public.order_status not null default 'new',
  subtotal_minor bigint not null
    constraint orders_subtotal_nonnegative check (subtotal_minor >= 0),
  shipping_minor bigint not null
    constraint orders_shipping_nonnegative check (shipping_minor >= 0),
  total_minor bigint not null
    constraint orders_total_consistent
    check (total_minor = subtotal_minor + shipping_minor),
  currency text not null default 'RON'
    constraint orders_currency_ron check (currency = 'RON'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_company_fields_consistent check (
    (
      customer_type = 'individual'::public.checkout_customer_type
      and company_name is null
      and company_tax_id is null
      and company_registration_number is null
    )
    or
    (
      customer_type = 'company'::public.checkout_customer_type
      and company_name = btrim(company_name)
      and company_name <> ''
      and length(company_name) <= 200
      and company_tax_id = btrim(company_tax_id)
      and company_tax_id <> ''
      and length(company_tax_id) <= 50
      and (
        company_registration_number is null
        or (
          company_registration_number = btrim(company_registration_number)
          and company_registration_number <> ''
          and length(company_registration_number) <= 80
        )
      )
    )
  ),
  constraint orders_payment_state_consistent check (
    (payment_method = 'cash_on_delivery'::public.order_payment_method
      and payment_status in (
        'unpaid'::public.order_payment_status,
        'paid'::public.order_payment_status,
        'refunded'::public.order_payment_status
      ))
    or
    (payment_method = 'card'::public.order_payment_method
      and payment_status in (
        'pending'::public.order_payment_status,
        'paid'::public.order_payment_status,
        'refunded'::public.order_payment_status
      ))
  )
);

create index orders_user_created_at_idx
  on public.orders (user_id, created_at desc)
  where user_id is not null;

create index orders_status_created_at_idx
  on public.orders (status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name text not null,
  product_slug text not null,
  variant_snapshot jsonb,
  customizations_snapshot jsonb not null default '[]'::jsonb
    constraint order_items_customizations_array
    check (jsonb_typeof(customizations_snapshot) = 'array'),
  unit_base_price_minor bigint not null
    constraint order_items_base_price_nonnegative
    check (unit_base_price_minor >= 0),
  customization_total_minor bigint not null
    constraint order_items_customization_total_nonnegative
    check (customization_total_minor >= 0),
  unit_price_minor bigint not null
    constraint order_items_unit_price_consistent
    check (unit_price_minor = unit_base_price_minor + customization_total_minor),
  quantity integer not null
    constraint order_items_quantity_valid check (quantity between 1 and 99),
  line_subtotal_minor bigint not null
    constraint order_items_subtotal_consistent
    check (line_subtotal_minor = unit_price_minor * quantity),
  created_at timestamptz not null default now(),
  constraint order_items_product_name_valid
    check (product_name = btrim(product_name) and product_name <> ''),
  constraint order_items_product_slug_valid
    check (product_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint order_items_variant_snapshot_object
    check (variant_snapshot is null or jsonb_typeof(variant_snapshot) = 'object')
);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx
  on public.order_items (product_id)
  where product_id is not null;

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  actor_user_id uuid references auth.users (id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  constraint order_status_history_change_valid
    check (from_status is null or from_status is distinct from to_status),
  constraint order_status_history_note_valid
    check (note is null or (note = btrim(note) and note <> ''))
);

create index order_status_history_order_created_at_idx
  on public.order_status_history (order_id, created_at);

create trigger shipping_methods_set_updated_at
before update on public.shipping_methods
for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

alter table public.shipping_methods enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;

revoke all on table
  public.shipping_methods,
  public.orders,
  public.order_items,
  public.order_status_history
from anon, authenticated;

grant select on table public.shipping_methods to anon, authenticated;
grant select on table
  public.orders,
  public.order_items,
  public.order_status_history
to authenticated;

grant insert, update, delete on table
  public.shipping_methods,
  public.orders,
  public.order_items,
  public.order_status_history
to authenticated;

create policy shipping_methods_public_select_active
on public.shipping_methods
for select
to anon, authenticated
using (is_active);

create policy shipping_methods_admin_all
on public.shipping_methods
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy orders_customer_select_own
on public.orders
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy orders_admin_all
on public.orders
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy order_items_customer_select_own
on public.order_items
for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and o.user_id = (select auth.uid())
  )
);

create policy order_items_admin_all
on public.order_items
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy order_status_history_customer_select_own
on public.order_status_history
for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_status_history.order_id
      and o.user_id = (select auth.uid())
  )
);

create policy order_status_history_admin_all
on public.order_status_history
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

commit;
