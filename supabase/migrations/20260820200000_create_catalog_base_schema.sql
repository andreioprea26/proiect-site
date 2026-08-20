begin;

-- Customizability is an independent product flag, while seasonality is modeled
-- through collection membership so either can be combined with every type.
create type public.product_type as enum (
  'standard',
  'unique',
  'made_to_order',
  'bundle'
);

create type public.product_publication_status as enum (
  'draft',
  'published',
  'archived'
);

create type public.product_availability_status as enum (
  'in_stock',
  'low_stock',
  'made_to_order',
  'unique',
  'unavailable'
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null
    constraint products_name_not_blank check (btrim(name) <> ''),
  slug text not null unique
    constraint products_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  base_price numeric(12, 2) not null
    constraint products_base_price_nonnegative check (base_price >= 0),
  product_type public.product_type not null,
  publication_status public.product_publication_status not null default 'draft',
  availability_status public.product_availability_status not null default 'unavailable',
  is_customizable boolean not null default false,
  lead_time_days smallint
    constraint products_lead_time_days_positive
    check (lead_time_days is null or lead_time_days > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null
    constraint categories_name_not_blank check (btrim(name) <> ''),
  slug text not null unique
    constraint categories_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null
    constraint collections_name_not_blank check (btrim(name) <> ''),
  slug text not null unique
    constraint collections_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_categories (
  product_id uuid not null
    references public.products (id) on delete cascade,
  category_id uuid not null
    references public.categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, category_id)
);

create index product_categories_category_id_idx
  on public.product_categories (category_id);

create table public.product_collections (
  product_id uuid not null
    references public.products (id) on delete cascade,
  collection_id uuid not null
    references public.collections (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, collection_id)
);

create index product_collections_collection_id_idx
  on public.product_collections (collection_id);

create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

create trigger collections_set_updated_at
before update on public.collections
for each row
execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.collections enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_collections enable row level security;

commit;
