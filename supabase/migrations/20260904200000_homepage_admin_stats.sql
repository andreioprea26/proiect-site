begin;

create type public.homepage_block_slot as enum (
  'hero',
  'categories',
  'products',
  'collections',
  'promo'
);

create table public.homepage_blocks (
  slot public.homepage_block_slot primary key,
  eyebrow text check (
    eyebrow is null or (eyebrow = btrim(eyebrow) and length(eyebrow) between 1 and 80)
  ),
  title text not null check (title = btrim(title) and length(title) between 2 and 120),
  subtitle text check (
    subtitle is null or (subtitle = btrim(subtitle) and length(subtitle) between 1 and 500)
  ),
  cta_label text check (
    cta_label is null or (cta_label = btrim(cta_label) and length(cta_label) between 1 and 80)
  ),
  cta_href text check (
    cta_href is null or (
      cta_href = btrim(cta_href)
      and length(cta_href) between 1 and 300
      and left(cta_href, 1) = '/'
      and left(cta_href, 2) <> '//'
      and cta_href ~ '^/[A-Za-z0-9/_?&=#.%-]*$'
    )
  ),
  is_active boolean not null default true,
  display_order integer not null default 0 check (display_order between 0 and 100),
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((cta_label is null) = (cta_href is null))
);

create index homepage_blocks_public_order_idx
on public.homepage_blocks (is_active, display_order, slot);

create trigger homepage_blocks_set_updated_at
before update on public.homepage_blocks
for each row execute function public.set_updated_at();

alter table public.homepage_blocks enable row level security;

revoke all on table public.homepage_blocks from anon, authenticated;
grant select on table public.homepage_blocks to authenticated;

create policy homepage_blocks_admin_select
on public.homepage_blocks
for select
to authenticated
using ((select public.is_admin()));

create function public.get_public_homepage_blocks()
returns table (
  slot public.homepage_block_slot,
  is_active boolean,
  display_order integer,
  eyebrow text,
  title text,
  subtitle text,
  cta_label text,
  cta_href text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    hb.slot,
    hb.is_active,
    hb.display_order,
    case when hb.is_active then hb.eyebrow else null end,
    case when hb.is_active then hb.title else null end,
    case when hb.is_active then hb.subtitle else null end,
    case when hb.is_active then hb.cta_label else null end,
    case when hb.is_active then hb.cta_href else null end
  from public.homepage_blocks hb
  order by hb.display_order, hb.slot;
$$;

create function public.upsert_homepage_block(
  p_slot public.homepage_block_slot,
  p_eyebrow text,
  p_title text,
  p_subtitle text,
  p_cta_label text,
  p_cta_href text,
  p_is_active boolean,
  p_display_order integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eyebrow text := nullif(btrim(coalesce(p_eyebrow, '')), '');
  v_title text := btrim(coalesce(p_title, ''));
  v_subtitle text := nullif(btrim(coalesce(p_subtitle, '')), '');
  v_cta_label text := nullif(btrim(coalesce(p_cta_label, '')), '');
  v_cta_href text := nullif(btrim(coalesce(p_cta_href, '')), '');
begin
  if auth.uid() is null or not public.is_admin() then
    return jsonb_build_object('success', false, 'code', 'unauthorized');
  end if;

  if p_slot is null
    or length(v_title) not between 2 and 120
    or (v_eyebrow is not null and length(v_eyebrow) > 80)
    or (v_subtitle is not null and length(v_subtitle) > 500)
    or (v_cta_label is not null and length(v_cta_label) > 80)
    or ((v_cta_label is null) <> (v_cta_href is null))
    or (v_cta_href is not null and (
      length(v_cta_href) > 300 or left(v_cta_href, 2) = '//'
      or v_cta_href !~ '^/[A-Za-z0-9/_?&=#.%-]*$'
    ))
    or p_is_active is null
    or p_display_order not between 0 and 100 then
    return jsonb_build_object('success', false, 'code', 'invalid_request');
  end if;

  insert into public.homepage_blocks (
    slot, eyebrow, title, subtitle, cta_label, cta_href,
    is_active, display_order, updated_by
  ) values (
    p_slot, v_eyebrow, v_title, v_subtitle, v_cta_label, v_cta_href,
    p_is_active, p_display_order, auth.uid()
  )
  on conflict (slot) do update set
    eyebrow = excluded.eyebrow,
    title = excluded.title,
    subtitle = excluded.subtitle,
    cta_label = excluded.cta_label,
    cta_href = excluded.cta_href,
    is_active = excluded.is_active,
    display_order = excluded.display_order,
    updated_by = excluded.updated_by;

  return jsonb_build_object('success', true, 'code', 'saved', 'slot', p_slot);
end;
$$;

create function public.get_admin_dashboard_stats(p_since timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_since timestamptz := coalesce(p_since, now() - interval '30 days');
  v_recent_orders bigint;
  v_attention_orders bigint;
  v_orders_by_status jsonb;
  v_stripe_gross bigint;
  v_cod_collected bigint;
  v_refunds bigint;
  v_pending_reviews bigint;
  v_new_contacts bigint;
  v_new_custom_requests bigint;
  v_active_subscribers bigint;
begin
  if auth.uid() is null or not public.is_admin() then
    return jsonb_build_object('success', false, 'code', 'unauthorized');
  end if;

  select count(*) into v_recent_orders
  from public.orders o where o.created_at >= v_since;

  select count(*) into v_attention_orders
  from public.orders o
  where o.status in ('new', 'awaiting_payment', 'awaiting_customization_review');

  select coalesce(jsonb_object_agg(grouped.status, grouped.total), '{}'::jsonb)
  into v_orders_by_status
  from (
    select o.status::text as status, count(*) as total
    from public.orders o
    where o.created_at >= v_since
    group by o.status
  ) grouped;

  select coalesce(sum(p.amount_minor), 0) into v_stripe_gross
  from public.payments p
  where p.provider = 'stripe'
    and p.status in ('paid', 'refunded')
    and p.currency = 'RON';

  select coalesce(sum(cc.expected_amount_minor), 0) into v_cod_collected
  from public.cod_collections cc
  where cc.status = 'collected' and cc.currency = 'RON';

  select coalesce(sum(pr.amount_minor), 0) into v_refunds
  from public.payment_refunds pr
  where pr.status = 'succeeded' and pr.currency = 'RON';

  select count(*) into v_pending_reviews
  from public.reviews r where r.status = 'pending';
  select count(*) into v_new_contacts
  from public.contact_requests cr where cr.status = 'new';
  select count(*) into v_new_custom_requests
  from public.custom_order_requests cor where cor.status = 'new';
  select count(*) into v_active_subscribers
  from public.newsletter_subscribers ns where ns.is_active;

  return jsonb_build_object(
    'success', true,
    'since', v_since,
    'currency', 'RON',
    'recentOrderCount', v_recent_orders,
    'attentionOrderCount', v_attention_orders,
    'ordersByStatus', v_orders_by_status,
    'stripeCollectedGrossMinor', v_stripe_gross,
    'codCollectedMinor', v_cod_collected,
    'successfulRefundsMinor', v_refunds,
    'stripeCollectedNetMinor', greatest(v_stripe_gross - v_refunds, 0),
    'pendingReviewCount', v_pending_reviews,
    'newContactCount', v_new_contacts,
    'newCustomRequestCount', v_new_custom_requests,
    'activeSubscriberCount', v_active_subscribers
  );
end;
$$;

revoke all on function public.get_public_homepage_blocks(),
  public.upsert_homepage_block(
    public.homepage_block_slot, text, text, text, text, text, boolean, integer
  ),
  public.get_admin_dashboard_stats(timestamptz)
from public, anon, authenticated;

grant execute on function public.get_public_homepage_blocks()
to anon, authenticated, service_role;
grant execute on function public.upsert_homepage_block(
  public.homepage_block_slot, text, text, text, text, text, boolean, integer
) to authenticated, service_role;
grant execute on function public.get_admin_dashboard_stats(timestamptz)
to authenticated, service_role;

commit;
