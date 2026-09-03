begin;

create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index favorites_product_id_idx on public.favorites (product_id);

create type public.review_moderation_status as enum (
  'pending',
  'approved',
  'rejected'
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  review_text text not null check (
    review_text = btrim(review_text)
    and length(review_text) between 10 and 2000
  ),
  verified_purchase boolean not null default true
    check (verified_purchase),
  status public.review_moderation_status not null default 'pending',
  author_display_name text not null check (
    author_display_name = btrim(author_display_name)
    and author_display_name <> ''
    and length(author_display_name) <= 100
  ),
  moderated_by uuid references auth.users (id) on delete restrict,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_user_product_unique unique (user_id, product_id),
  constraint reviews_moderation_consistent check (
    (status = 'pending' and moderated_by is null and moderated_at is null)
    or
    (status in ('approved', 'rejected')
      and moderated_by is not null and moderated_at is not null)
  )
);

create index reviews_product_status_created_idx
  on public.reviews (product_id, status, created_at desc);
create index reviews_status_created_idx
  on public.reviews (status, created_at desc);

create table public.review_moderation_events (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  from_status public.review_moderation_status not null,
  to_status public.review_moderation_status not null
    check (to_status in ('approved', 'rejected')),
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  check (from_status is distinct from to_status)
);

create index review_moderation_events_review_created_idx
  on public.review_moderation_events (review_id, created_at desc);

create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

alter table public.favorites enable row level security;
alter table public.reviews enable row level security;
alter table public.review_moderation_events enable row level security;

revoke all on table public.favorites, public.reviews,
  public.review_moderation_events from anon, authenticated;
grant select, insert, delete on table public.favorites to authenticated;
grant select on table public.reviews, public.review_moderation_events
  to authenticated;

create policy favorites_customer_select_own on public.favorites
for select to authenticated
using ((select auth.uid()) = user_id);

create policy favorites_customer_insert_own on public.favorites
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy favorites_customer_delete_own on public.favorites
for delete to authenticated
using ((select auth.uid()) = user_id);

create policy favorites_admin_select on public.favorites
for select to authenticated
using ((select public.is_admin()));

create policy reviews_customer_select_own on public.reviews
for select to authenticated
using ((select auth.uid()) = user_id);

create policy reviews_admin_select on public.reviews
for select to authenticated
using ((select public.is_admin()));

create policy review_moderation_events_admin_select
on public.review_moderation_events
for select to authenticated
using ((select public.is_admin()));

-- Customer order details remain read-only and inherit ownership from orders.
create policy payments_customer_select_own on public.payments
for select to authenticated
using (exists (
  select 1 from public.orders o
  where o.id = payments.order_id
    and o.user_id = (select auth.uid())
));

create policy shipments_customer_select_own on public.shipments
for select to authenticated
using (exists (
  select 1 from public.orders o
  where o.id = shipments.order_id
    and o.user_id = (select auth.uid())
));

create policy payment_refunds_customer_select_own on public.payment_refunds
for select to authenticated
using (exists (
  select 1
  from public.payments p
  join public.orders o on o.id = p.order_id
  where p.id = payment_refunds.payment_id
    and o.user_id = (select auth.uid())
));

create policy cod_collections_customer_select_own on public.cod_collections
for select to authenticated
using (exists (
  select 1 from public.orders o
  where o.id = cod_collections.order_id
    and o.user_id = (select auth.uid())
));

create function public.can_review_product(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.user_id = (select auth.uid())
      and oi.product_id = p_product_id
      and o.payment_status = 'paid'::public.order_payment_status
      and o.status in (
        'shipped'::public.order_status,
        'completed'::public.order_status,
        'returned'::public.order_status
      )
  );
$$;

revoke all on function public.can_review_product(uuid)
from public, anon;
grant execute on function public.can_review_product(uuid)
to authenticated, service_role;

create function public.submit_verified_review(
  p_product_id uuid,
  p_rating integer,
  p_review_text text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_text text := btrim(coalesce(p_review_text, ''));
  v_author_name text;
  v_review_id uuid;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'code', 'unauthenticated');
  end if;
  if p_product_id is null or p_rating is null or p_rating not between 1 and 5
    or length(v_text) not between 10 and 2000
  then
    return jsonb_build_object('success', false, 'code', 'invalid_review');
  end if;
  if not public.can_review_product(p_product_id) then
    return jsonb_build_object('success', false, 'code', 'not_eligible');
  end if;

  select nullif(btrim(concat_ws(' ',
    nullif(btrim(p.first_name), ''),
    case when nullif(btrim(p.last_name), '') is not null
      then left(btrim(p.last_name), 1) || '.' end
  )), '')
  into v_author_name
  from public.profiles p
  where p.id = v_user_id;

  insert into public.reviews (
    product_id, user_id, rating, review_text,
    verified_purchase, status, author_display_name
  ) values (
    p_product_id, v_user_id, p_rating, v_text,
    true, 'pending', coalesce(v_author_name, 'Client verificat')
  )
  returning id into v_review_id;

  return jsonb_build_object(
    'success', true,
    'reviewId', v_review_id,
    'status', 'pending'
  );
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'code', 'duplicate_review');
end;
$$;

revoke all on function public.submit_verified_review(uuid, integer, text)
from public, anon;
grant execute on function public.submit_verified_review(uuid, integer, text)
to authenticated, service_role;

create function public.moderate_product_review(
  p_review_id uuid,
  p_status public.review_moderation_status
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_review public.reviews%rowtype;
begin
  if v_actor_id is null or not public.is_admin() then
    return jsonb_build_object('success', false, 'code', 'unauthorized');
  end if;
  if p_review_id is null or p_status is null
    or p_status not in ('approved', 'rejected') then
    return jsonb_build_object('success', false, 'code', 'invalid_request');
  end if;

  select * into v_review
  from public.reviews
  where id = p_review_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'code', 'review_not_found');
  end if;
  if v_review.status = p_status then
    return jsonb_build_object(
      'success', true, 'reviewId', p_review_id,
      'status', p_status, 'idempotentReplay', true
    );
  end if;

  update public.reviews
  set status = p_status, moderated_by = v_actor_id, moderated_at = now()
  where id = p_review_id;

  insert into public.review_moderation_events (
    review_id, from_status, to_status, actor_user_id
  ) values (
    p_review_id, v_review.status, p_status, v_actor_id
  );

  return jsonb_build_object(
    'success', true, 'reviewId', p_review_id,
    'status', p_status, 'idempotentReplay', false
  );
end;
$$;

revoke all on function public.moderate_product_review(
  uuid, public.review_moderation_status
) from public, anon;
grant execute on function public.moderate_product_review(
  uuid, public.review_moderation_status
) to authenticated, service_role;

create function public.get_approved_product_reviews(p_product_id uuid)
returns table (
  id uuid,
  rating smallint,
  review_text text,
  verified_purchase boolean,
  author_display_name text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.rating, r.review_text, r.verified_purchase,
    r.author_display_name, r.created_at
  from public.reviews r
  join public.products p on p.id = r.product_id
  where r.product_id = p_product_id
    and r.status = 'approved'::public.review_moderation_status
    and p.publication_status = 'published'::public.product_publication_status
  order by r.created_at desc;
$$;

revoke all on function public.get_approved_product_reviews(uuid) from public;
grant execute on function public.get_approved_product_reviews(uuid)
to anon, authenticated, service_role;

commit;
