begin;

create type public.contact_request_status as enum ('new', 'in_progress', 'closed');
create type public.custom_request_status as enum ('new', 'reviewing', 'accepted', 'rejected', 'closed');
create type public.content_page_status as enum ('draft', 'published');

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (
    email = lower(btrim(email)) and length(email) between 3 and 254
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  user_id uuid references auth.users (id) on delete set null,
  is_active boolean not null default true,
  source text not null default 'footer' check (source in ('footer', 'homepage')),
  consented_at timestamptz not null default now(),
  consent_version text not null default 'newsletter-mvp-v1',
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((is_active and unsubscribed_at is null) or (not is_active and unsubscribed_at is not null))
);

create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (name = btrim(name) and length(name) between 2 and 100),
  email text not null check (
    email = lower(btrim(email)) and length(email) between 3 and 254
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  category text not null check (category in ('general', 'order', 'product', 'complaint', 'other')),
  message text not null check (message = btrim(message) and length(message) between 20 and 4000),
  status public.contact_request_status not null default 'new',
  internal_note text check (internal_note is null or length(internal_note) <= 4000),
  submission_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.custom_order_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (name = btrim(name) and length(name) between 2 and 100),
  email text not null check (
    email = lower(btrim(email)) and length(email) between 3 and 254
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  description text not null check (description = btrim(description) and length(description) between 30 and 5000),
  budget_minor integer check (budget_minor is null or budget_minor between 0 and 100000000),
  desired_date date,
  status public.custom_request_status not null default 'new',
  internal_note text check (internal_note is null or length(internal_note) <= 4000),
  submission_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and length(slug) <= 100),
  title text not null check (title = btrim(title) and length(title) between 2 and 120),
  content text not null check (content = btrim(content) and length(content) between 1 and 20000),
  status public.content_page_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'draft' and published_at is null) or (status = 'published' and published_at is not null))
);

create index newsletter_subscribers_status_idx on public.newsletter_subscribers (is_active, created_at desc);
create index contact_requests_status_idx on public.contact_requests (status, created_at desc);
create index custom_order_requests_status_idx on public.custom_order_requests (status, created_at desc);
create index content_pages_status_idx on public.content_pages (status, title);

create trigger newsletter_subscribers_set_updated_at before update on public.newsletter_subscribers
for each row execute function public.set_updated_at();
create trigger contact_requests_set_updated_at before update on public.contact_requests
for each row execute function public.set_updated_at();
create trigger custom_order_requests_set_updated_at before update on public.custom_order_requests
for each row execute function public.set_updated_at();
create trigger content_pages_set_updated_at before update on public.content_pages
for each row execute function public.set_updated_at();

alter table public.newsletter_subscribers enable row level security;
alter table public.contact_requests enable row level security;
alter table public.custom_order_requests enable row level security;
alter table public.content_pages enable row level security;

revoke all on table public.newsletter_subscribers, public.contact_requests,
  public.custom_order_requests, public.content_pages from anon, authenticated;
grant select on table public.newsletter_subscribers, public.contact_requests,
  public.custom_order_requests to authenticated;
grant select on table public.content_pages to anon, authenticated;

create policy newsletter_admin_select on public.newsletter_subscribers
for select to authenticated using ((select public.is_admin()));
create policy contact_requests_admin_select on public.contact_requests
for select to authenticated using ((select public.is_admin()));
create policy custom_order_requests_admin_select on public.custom_order_requests
for select to authenticated using ((select public.is_admin()));
create policy content_pages_public_select on public.content_pages
for select to anon, authenticated
using (status = 'published'::public.content_page_status or (select public.is_admin()));

create function public.subscribe_newsletter(p_email text, p_source text default 'footer')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_source text := case when p_source in ('footer', 'homepage') then p_source else 'footer' end;
  v_now timestamptz := now();
begin
  if length(v_email) not between 3 and 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return jsonb_build_object('success', false, 'code', 'invalid_email');
  end if;

  insert into public.newsletter_subscribers (
    email, user_id, is_active, source, consented_at, consent_version, subscribed_at
  ) values (
    v_email, auth.uid(), true, v_source, v_now, 'newsletter-mvp-v1', v_now
  )
  on conflict (email) do update set
    user_id = coalesce(public.newsletter_subscribers.user_id, excluded.user_id),
    is_active = true,
    source = excluded.source,
    consented_at = case when public.newsletter_subscribers.is_active then public.newsletter_subscribers.consented_at else excluded.consented_at end,
    subscribed_at = case when public.newsletter_subscribers.is_active then public.newsletter_subscribers.subscribed_at else excluded.subscribed_at end,
    unsubscribed_at = null;

  return jsonb_build_object('success', true, 'code', 'accepted');
end;
$$;

create function public.submit_contact_request(
  p_name text, p_email text, p_category text, p_message text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_category text := btrim(coalesce(p_category, ''));
  v_message text := btrim(coalesce(p_message, ''));
  v_key text;
begin
  if length(v_name) not between 2 and 100
    or length(v_email) not between 3 and 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or v_category not in ('general', 'order', 'product', 'complaint', 'other')
    or length(v_message) not between 20 and 4000 then
    return jsonb_build_object('success', false, 'code', 'invalid_request');
  end if;
  if (select count(*) from public.contact_requests where email = v_email and created_at > now() - interval '1 hour') >= 4 then
    return jsonb_build_object('success', true, 'code', 'accepted');
  end if;
  v_key := md5(v_email || '|' || v_category || '|' || v_message || '|' || current_date::text);
  insert into public.contact_requests (user_id, name, email, category, message, submission_key)
  values (auth.uid(), v_name, v_email, v_category, v_message, v_key)
  on conflict (submission_key) do nothing;
  return jsonb_build_object('success', true, 'code', 'accepted');
end;
$$;

create function public.submit_custom_order_request(
  p_name text, p_email text, p_description text, p_budget_minor integer, p_desired_date date
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_description text := btrim(coalesce(p_description, ''));
  v_key text;
begin
  if length(v_name) not between 2 and 100
    or length(v_email) not between 3 and 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or length(v_description) not between 30 and 5000
    or (p_budget_minor is not null and p_budget_minor not between 0 and 100000000) then
    return jsonb_build_object('success', false, 'code', 'invalid_request');
  end if;
  if (select count(*) from public.custom_order_requests where email = v_email and created_at > now() - interval '1 day') >= 3 then
    return jsonb_build_object('success', true, 'code', 'accepted');
  end if;
  v_key := md5(v_email || '|' || v_description || '|' || current_date::text);
  insert into public.custom_order_requests (
    user_id, name, email, description, budget_minor, desired_date, submission_key
  ) values (auth.uid(), v_name, v_email, v_description, p_budget_minor, p_desired_date, v_key)
  on conflict (submission_key) do nothing;
  return jsonb_build_object('success', true, 'code', 'accepted');
end;
$$;

create function public.manage_newsletter_subscription(p_id uuid, p_active boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_admin() then
    return jsonb_build_object('success', false, 'code', 'unauthorized');
  end if;
  update public.newsletter_subscribers set
    is_active = p_active,
    unsubscribed_at = case when p_active then null else now() end
  where id = p_id;
  if not found then return jsonb_build_object('success', false, 'code', 'not_found'); end if;
  return jsonb_build_object('success', true, 'code', 'updated');
end;
$$;

create function public.manage_contact_request(p_id uuid, p_status public.contact_request_status, p_internal_note text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_admin() then
    return jsonb_build_object('success', false, 'code', 'unauthorized');
  end if;
  if p_status is null or length(coalesce(p_internal_note, '')) > 4000 then
    return jsonb_build_object('success', false, 'code', 'invalid_request');
  end if;
  update public.contact_requests set status = p_status, internal_note = nullif(btrim(p_internal_note), '') where id = p_id;
  if not found then return jsonb_build_object('success', false, 'code', 'not_found'); end if;
  return jsonb_build_object('success', true, 'code', 'updated');
end;
$$;

create function public.manage_custom_order_request(p_id uuid, p_status public.custom_request_status, p_internal_note text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_admin() then
    return jsonb_build_object('success', false, 'code', 'unauthorized');
  end if;
  if p_status is null or length(coalesce(p_internal_note, '')) > 4000 then
    return jsonb_build_object('success', false, 'code', 'invalid_request');
  end if;
  update public.custom_order_requests set status = p_status, internal_note = nullif(btrim(p_internal_note), '') where id = p_id;
  if not found then return jsonb_build_object('success', false, 'code', 'not_found'); end if;
  return jsonb_build_object('success', true, 'code', 'updated');
end;
$$;

create function public.upsert_content_page(
  p_id uuid, p_slug text, p_title text, p_content text, p_status public.content_page_status
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    return jsonb_build_object('success', false, 'code', 'unauthorized');
  end if;
  if p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or length(p_slug) > 100
    or length(btrim(coalesce(p_title, ''))) not between 2 and 120
    or length(btrim(coalesce(p_content, ''))) not between 1 and 20000
    or p_status is null then
    return jsonb_build_object('success', false, 'code', 'invalid_request');
  end if;
  if p_id is null then
    insert into public.content_pages (slug, title, content, status, published_at)
    values (p_slug, btrim(p_title), btrim(p_content), p_status,
      case when p_status = 'published' then now() else null end)
    returning id into v_id;
  else
    update public.content_pages set slug = p_slug, title = btrim(p_title), content = btrim(p_content), status = p_status,
      published_at = case when p_status = 'published' then coalesce(published_at, now()) else null end
    where id = p_id returning id into v_id;
    if not found then return jsonb_build_object('success', false, 'code', 'not_found'); end if;
  end if;
  return jsonb_build_object('success', true, 'code', 'saved', 'pageId', v_id);
exception when unique_violation then
  return jsonb_build_object('success', false, 'code', 'duplicate_slug');
end;
$$;

revoke all on function public.subscribe_newsletter(text, text),
  public.submit_contact_request(text, text, text, text),
  public.submit_custom_order_request(text, text, text, integer, date),
  public.manage_newsletter_subscription(uuid, boolean),
  public.manage_contact_request(uuid, public.contact_request_status, text),
  public.manage_custom_order_request(uuid, public.custom_request_status, text),
  public.upsert_content_page(uuid, text, text, text, public.content_page_status)
from public;

grant execute on function public.subscribe_newsletter(text, text),
  public.submit_contact_request(text, text, text, text),
  public.submit_custom_order_request(text, text, text, integer, date)
to anon, authenticated, service_role;
grant execute on function public.manage_newsletter_subscription(uuid, boolean),
  public.manage_contact_request(uuid, public.contact_request_status, text),
  public.manage_custom_order_request(uuid, public.custom_request_status, text),
  public.upsert_content_page(uuid, text, text, text, public.content_page_status)
to authenticated, service_role;

commit;
