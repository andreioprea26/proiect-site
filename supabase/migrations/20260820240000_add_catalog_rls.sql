begin;

-- The table owner bypasses user_roles RLS while the fixed search path prevents
-- caller-controlled object resolution. The helper exposes only whether the
-- current authenticated identity has the real admin role.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and ur.role = 'admin'::public.app_role
    );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- Catalog rows are readable through public policies below. Only authenticated
-- admins receive write privileges, and RLS still verifies the real DB role.
revoke all on table
  public.products,
  public.categories,
  public.collections,
  public.product_categories,
  public.product_collections,
  public.product_variants,
  public.customization_options,
  public.product_images
from anon, authenticated;

grant select on table
  public.products,
  public.categories,
  public.collections,
  public.product_categories,
  public.product_collections,
  public.product_variants,
  public.customization_options,
  public.product_images
to anon, authenticated;

grant insert, update, delete on table
  public.products,
  public.categories,
  public.collections,
  public.product_categories,
  public.product_collections,
  public.product_variants,
  public.customization_options,
  public.product_images
to authenticated;

create policy products_public_select
on public.products
for select
to anon, authenticated
using (publication_status = 'published'::public.product_publication_status);

create policy products_admin_all
on public.products
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy product_variants_public_select
on public.product_variants
for select
to anon, authenticated
using (
  is_active
  and exists (
    select 1
    from public.products p
    where p.id = product_variants.product_id
      and p.publication_status = 'published'::public.product_publication_status
  )
);

create policy product_variants_admin_all
on public.product_variants
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy customization_options_public_select
on public.customization_options
for select
to anon, authenticated
using (
  is_active
  and exists (
    select 1
    from public.products p
    where p.id = customization_options.product_id
      and p.publication_status = 'published'::public.product_publication_status
  )
);

create policy customization_options_admin_all
on public.customization_options
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy product_images_public_select
on public.product_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = product_images.product_id
      and p.publication_status = 'published'::public.product_publication_status
  )
);

create policy product_images_admin_all
on public.product_images
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy product_categories_public_select
on public.product_categories
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = product_categories.product_id
      and p.publication_status = 'published'::public.product_publication_status
  )
);

create policy product_categories_admin_all
on public.product_categories
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy product_collections_public_select
on public.product_collections
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = product_collections.product_id
      and p.publication_status = 'published'::public.product_publication_status
  )
);

create policy product_collections_admin_all
on public.product_collections
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy categories_public_select
on public.categories
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.product_categories pc
    join public.products p on p.id = pc.product_id
    where pc.category_id = categories.id
      and p.publication_status = 'published'::public.product_publication_status
  )
);

create policy categories_admin_all
on public.categories
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy collections_public_select
on public.collections
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.product_collections pc
    join public.products p on p.id = pc.product_id
    where pc.collection_id = collections.id
      and p.publication_status = 'published'::public.product_publication_status
  )
);

create policy collections_admin_all
on public.collections
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Inventory is deliberately not public. Admins may create a zero-quantity row
-- and edit only its low-stock threshold; every quantity change must use the
-- audited adjust_inventory RPC below.
revoke all on table public.inventory from anon, authenticated;
grant select, insert on table public.inventory to authenticated;
grant update (low_stock_threshold) on public.inventory to authenticated;

create policy inventory_admin_select
on public.inventory
for select
to authenticated
using ((select public.is_admin()));

create policy inventory_admin_insert_zero
on public.inventory
for insert
to authenticated
with check ((select public.is_admin()) and quantity = 0);

create policy inventory_admin_update_threshold
on public.inventory
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Movement history is append-only through adjust_inventory and visible only
-- to admins. No client role receives direct INSERT, UPDATE, or DELETE rights.
revoke all on table public.inventory_movements from anon, authenticated;
grant select on table public.inventory_movements to authenticated;

create policy inventory_movements_admin_select
on public.inventory_movements
for select
to authenticated
using ((select public.is_admin()));

-- SECURITY DEFINER allows an authenticated admin to use the atomic path
-- without exposing service_role. Non-service callers cannot spoof the actor.
create or replace function public.adjust_inventory(
  p_inventory_id uuid,
  p_quantity_delta integer,
  p_reason text default null,
  p_actor_user_id uuid default null,
  p_context jsonb default '{}'::jsonb
)
returns public.inventory
language plpgsql
security definer
set search_path = ''
as $$
declare
  inventory_row public.inventory%rowtype;
  previous_quantity integer;
  next_quantity bigint;
  caller_user_id uuid := (select auth.uid());
  caller_is_service_role boolean := coalesce(
    (select auth.role()) = 'service_role',
    false
  );
  movement_actor_user_id uuid;
begin
  if not caller_is_service_role and not (select public.is_admin()) then
    raise exception 'Only administrators may adjust inventory.'
      using errcode = '42501';
  end if;

  if not caller_is_service_role
    and p_actor_user_id is not null
    and p_actor_user_id is distinct from caller_user_id then
    raise exception 'Administrators cannot attribute adjustments to another actor.'
      using errcode = '42501';
  end if;

  movement_actor_user_id := case
    when caller_is_service_role then p_actor_user_id
    else caller_user_id
  end;

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
    movement_actor_user_id,
    p_context
  );

  return inventory_row;
end;
$$;

revoke all on function public.adjust_inventory(uuid, integer, text, uuid, jsonb)
from public, anon;

grant execute on function public.adjust_inventory(uuid, integer, text, uuid, jsonb)
to authenticated, service_role;

-- Public bucket delivery bypasses SELECT RLS by design. These policies govern
-- listing and every mutating Storage API operation, all limited to DB admins.
create policy product_images_storage_admin_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'product-images'
  and (select public.is_admin())
);

create policy product_images_storage_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and (select public.is_admin())
);

create policy product_images_storage_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-images'
  and (select public.is_admin())
)
with check (
  bucket_id = 'product-images'
  and (select public.is_admin())
);

create policy product_images_storage_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
  and (select public.is_admin())
);

commit;
