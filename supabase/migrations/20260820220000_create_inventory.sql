begin;

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete cascade,
  quantity integer not null default 0
    constraint inventory_quantity_nonnegative check (quantity >= 0),
  low_stock_threshold integer
    constraint inventory_low_stock_threshold_nonnegative
    check (low_stock_threshold is null or low_stock_threshold >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_exactly_one_target
    check (num_nonnulls(product_id, variant_id) = 1)
);

create unique index inventory_product_unique_idx
  on public.inventory (product_id)
  where product_id is not null;

create unique index inventory_variant_unique_idx
  on public.inventory (variant_id)
  where variant_id is not null;

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null
    references public.inventory (id) on delete cascade,
  quantity_delta integer not null
    constraint inventory_movements_delta_nonzero check (quantity_delta <> 0),
  quantity_before integer not null
    constraint inventory_movements_quantity_before_nonnegative
    check (quantity_before >= 0),
  quantity_after integer not null
    constraint inventory_movements_quantity_after_nonnegative
    check (quantity_after >= 0),
  reason text
    constraint inventory_movements_reason_valid
    check (reason is null or (reason = btrim(reason) and reason <> '')),
  actor_user_id uuid references auth.users (id) on delete set null,
  context jsonb not null default '{}'::jsonb
    constraint inventory_movements_context_object
    check (jsonb_typeof(context) = 'object'),
  created_at timestamptz not null default now(),
  constraint inventory_movements_quantities_consistent
    check (
      quantity_after::bigint = quantity_before::bigint + quantity_delta::bigint
    )
);

create index inventory_movements_inventory_created_at_idx
  on public.inventory_movements (inventory_id, created_at desc);

create index inventory_movements_actor_user_id_idx
  on public.inventory_movements (actor_user_id)
  where actor_user_id is not null;

-- Locking the parent product serializes target-mode checks and the aggregate
-- stock rule across every variant of the same product.
create function public.validate_inventory_target()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_product_id uuid;
  target_product_type public.product_type;
  existing_quantity bigint;
begin
  if num_nonnulls(new.product_id, new.variant_id) <> 1 then
    raise exception 'Inventory must target exactly one product or variant.'
      using errcode = '23514';
  end if;

  if new.quantity is null or new.quantity < 0 then
    raise exception 'Inventory quantity cannot be negative.'
      using errcode = '23514';
  end if;

  if new.product_id is not null then
    select p.id, p.product_type
    into target_product_id, target_product_type
    from public.products p
    where p.id = new.product_id
    for update;

    if target_product_id is null then
      raise exception 'Inventory product does not exist.'
        using errcode = '23503';
    end if;

    if exists (
      select 1
      from public.product_variants v
      where v.product_id = target_product_id
    ) then
      raise exception 'Products with variants must track inventory per variant.'
        using errcode = '23514';
    end if;
  else
    select p.id, p.product_type
    into target_product_id, target_product_type
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = new.variant_id
    for share of v
    for update of p;

    if target_product_id is null then
      raise exception 'Inventory variant does not exist.'
        using errcode = '23503';
    end if;

    if exists (
      select 1
      from public.inventory i
      where i.product_id = target_product_id
        and i.id is distinct from new.id
    ) then
      raise exception 'Variant inventory cannot coexist with direct product inventory.'
        using errcode = '23514';
    end if;
  end if;

  if target_product_type = 'unique'::public.product_type then
    select coalesce(sum(i.quantity), 0)
    into existing_quantity
    from public.inventory i
    left join public.product_variants v on v.id = i.variant_id
    where coalesce(i.product_id, v.product_id) = target_product_id
      and i.id is distinct from new.id;

    if existing_quantity + new.quantity > 1 then
      raise exception 'A unique product cannot have total inventory above 1.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger inventory_validate_target
before insert or update of product_id, variant_id, quantity
on public.inventory
for each row
execute function public.validate_inventory_target();

-- Changing a product to unique must also respect stock that already exists.
create function public.validate_unique_product_inventory()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  total_quantity bigint;
begin
  if new.product_type = 'unique'::public.product_type then
    select coalesce(sum(i.quantity), 0)
    into total_quantity
    from public.inventory i
    left join public.product_variants v on v.id = i.variant_id
    where coalesce(i.product_id, v.product_id) = new.id;

    if total_quantity > 1 then
      raise exception 'A product with inventory above 1 cannot become unique.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger products_validate_unique_inventory
before update of product_type on public.products
for each row
execute function public.validate_unique_product_inventory();

-- A variant cannot be added beneath a product that already tracks stock
-- directly, and a variant with inventory cannot be moved to another product.
create function public.validate_product_variant_inventory()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  locked_product_id uuid;
begin
  select p.id
  into locked_product_id
  from public.products p
  where p.id = new.product_id
  for update;

  if locked_product_id is null then
    raise exception 'Variant product does not exist.'
      using errcode = '23503';
  end if;

  if tg_op = 'UPDATE'
    and old.product_id is distinct from new.product_id
    and exists (
      select 1
      from public.inventory i
      where i.variant_id = old.id
    ) then
    raise exception 'A variant with inventory cannot move to another product.'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.inventory i
    where i.product_id = new.product_id
  ) then
    raise exception 'A variant cannot be added to a product with direct inventory.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger product_variants_validate_inventory
before insert or update of product_id on public.product_variants
for each row
execute function public.validate_product_variant_inventory();

-- The normal write path locks one inventory row, validates the result, updates
-- it, and appends the audit movement atomically in the caller's transaction.
create function public.adjust_inventory(
  p_inventory_id uuid,
  p_quantity_delta integer,
  p_reason text default null,
  p_actor_user_id uuid default null,
  p_context jsonb default '{}'::jsonb
)
returns public.inventory
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inventory_row public.inventory%rowtype;
  previous_quantity integer;
  next_quantity bigint;
begin
  if p_quantity_delta is null or p_quantity_delta = 0 then
    raise exception 'Inventory adjustment delta must be nonzero.'
      using errcode = '22023';
  end if;

  if p_reason is not null
    and (p_reason <> btrim(p_reason) or p_reason = '') then
    raise exception 'Inventory adjustment reason must be nonblank and trimmed.'
      using errcode = '22023';
  end if;

  if p_context is null or jsonb_typeof(p_context) <> 'object' then
    raise exception 'Inventory adjustment context must be a JSON object.'
      using errcode = '22023';
  end if;

  select i.*
  into inventory_row
  from public.inventory i
  where i.id = p_inventory_id
  for update;

  if not found then
    raise exception 'Inventory row does not exist.'
      using errcode = 'P0002';
  end if;

  previous_quantity := inventory_row.quantity;
  next_quantity := previous_quantity::bigint + p_quantity_delta::bigint;

  if next_quantity < 0 then
    raise exception 'Inventory adjustment would make quantity negative.'
      using errcode = '23514';
  end if;

  if next_quantity > 2147483647 then
    raise exception 'Inventory adjustment exceeds the supported quantity.'
      using errcode = '22003';
  end if;

  update public.inventory
  set quantity = next_quantity::integer
  where id = p_inventory_id
  returning * into inventory_row;

  insert into public.inventory_movements (
    inventory_id,
    quantity_delta,
    quantity_before,
    quantity_after,
    reason,
    actor_user_id,
    context
  )
  values (
    inventory_row.id,
    p_quantity_delta,
    previous_quantity,
    inventory_row.quantity,
    p_reason,
    p_actor_user_id,
    p_context
  );

  return inventory_row;
end;
$$;

revoke all on function public.adjust_inventory(uuid, integer, text, uuid, jsonb)
from public, anon, authenticated;

grant execute on function public.adjust_inventory(uuid, integer, text, uuid, jsonb)
to service_role;

create trigger inventory_set_updated_at
before update on public.inventory
for each row
execute function public.set_updated_at();

alter table public.inventory enable row level security;
alter table public.inventory_movements enable row level security;

commit;
