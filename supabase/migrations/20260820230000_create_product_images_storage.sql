begin;

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null
    references public.products (id) on delete cascade,
  -- Stable object key inside the product-images bucket. Public URLs are
  -- derived at read time so environment or CDN changes do not alter this row.
  storage_path text not null,
  display_order integer not null default 0
    constraint product_images_display_order_nonnegative
    check (display_order >= 0),
  alt_text text
    constraint product_images_alt_text_valid
    check (alt_text is null or (alt_text = btrim(alt_text) and alt_text <> '')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_images_storage_path_valid
    check (
      storage_path = btrim(storage_path)
      and storage_path <> ''
      and storage_path !~ '(^/|//|/$)'
      and storage_path like product_id::text || '/%'
    ),
  constraint product_images_storage_path_key unique (storage_path),
  constraint product_images_product_display_order_key
    unique (product_id, display_order)
);

create trigger product_images_set_updated_at
before update on public.product_images
for each row
execute function public.set_updated_at();

alter table public.product_images enable row level security;

-- Public product media is isolated from future private customer uploads.
-- Five MiB is sufficient for optimized MVP product photography; SVG and
-- animated formats are deliberately excluded.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif'
  ]::text[]
);

commit;
