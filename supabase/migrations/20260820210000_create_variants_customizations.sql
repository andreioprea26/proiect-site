begin;

create type public.customization_option_type as enum (
  'selection',
  'text',
  'boolean',
  'image'
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null
    references public.products (id) on delete cascade,
  title text not null
    constraint product_variants_title_valid
    check (title = btrim(title) and title <> ''),
  -- A compact object such as {"size": "M", "color": "red"} identifies the
  -- fixed configuration without introducing option-type/value tables in MVP.
  attributes jsonb not null
    constraint product_variants_attributes_nonempty_object
    check (jsonb_typeof(attributes) = 'object' and attributes <> '{}'::jsonb),
  price_override numeric(12, 2)
    constraint product_variants_price_override_nonnegative
    check (price_override is null or price_override >= 0),
  sku text
    constraint product_variants_sku_valid
    check (sku is null or (sku = btrim(sku) and sku <> '')),
  is_active boolean not null default true,
  display_order integer not null default 0
    constraint product_variants_display_order_nonnegative
    check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_product_attributes_key
    unique (product_id, attributes)
);

-- SKUs are optional, but present values identify variants globally and are
-- compared case-insensitively to avoid administrative duplicates.
create unique index product_variants_sku_unique_idx
  on public.product_variants (lower(sku))
  where sku is not null;

create table public.customization_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null
    references public.products (id) on delete cascade,
  name text not null
    constraint customization_options_name_valid
    check (name = btrim(name) and name <> ''),
  description text,
  option_type public.customization_option_type not null,
  is_required boolean not null default false,
  additional_cost numeric(12, 2) not null default 0
    constraint customization_options_additional_cost_nonnegative
    check (additional_cost >= 0),
  -- Type-specific UI rules live in a small object, for example allowed values
  -- for selection or min_length/max_length/multiline for text.
  configuration jsonb not null default '{}'::jsonb
    constraint customization_options_configuration_object
    check (jsonb_typeof(configuration) = 'object'),
  display_order integer not null default 0
    constraint customization_options_display_order_nonnegative
    check (display_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Option names are administrative identifiers within a product. Normalizing
-- case in the index prevents visually duplicate options such as Name/name.
create unique index customization_options_product_name_unique_idx
  on public.customization_options (product_id, lower(name));

create trigger product_variants_set_updated_at
before update on public.product_variants
for each row
execute function public.set_updated_at();

create trigger customization_options_set_updated_at
before update on public.customization_options
for each row
execute function public.set_updated_at();

alter table public.product_variants enable row level security;
alter table public.customization_options enable row level security;

commit;
