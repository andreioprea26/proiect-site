begin;

-- Fixed public allowlist; no JSON settings bag or infrastructure fields.
create function public.valid_store_setting(p_field text, p_value text)
returns boolean language sql immutable set search_path = '' as $$
  select p_value is null or (
    p_value = btrim(p_value) and length(p_value) >= 1
    and p_value !~ '[<>[:cntrl:]]'
    and case p_field
      when 'display_name' then length(p_value) <= 120
      when 'tagline' then length(p_value) <= 160
      when 'short_description' then length(p_value) <= 500
      when 'seo_description' then length(p_value) <= 300
      when 'footer_description' then length(p_value) <= 500
      when 'public_email' then length(p_value) <= 254 and p_value ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
      when 'public_phone' then length(p_value) <= 16 and p_value ~ '^\+?[0-9]{7,15}$'
      when 'whatsapp' then length(p_value) <= 16 and p_value ~ '^\+?[0-9]{7,15}$'
      when 'instagram_url' then length(p_value) <= 300 and p_value ~ '^https://(www\.)?instagram\.com(/[A-Za-z0-9._~/@-]*)?$'
      when 'facebook_url' then length(p_value) <= 300 and p_value ~ '^https://(www\.)?facebook\.com(/[A-Za-z0-9._~/@-]*)?$'
      when 'tiktok_url' then length(p_value) <= 300 and p_value ~ '^https://(www\.)?tiktok\.com(/[A-Za-z0-9._~/@-]*)?$'
      else false end
  );
$$;
revoke all on function public.valid_store_setting(text,text) from public, anon, authenticated, service_role;

create table public.store_settings (
  singleton boolean primary key default true check (singleton),
  display_name text check (public.valid_store_setting('display_name', display_name)),
  tagline text check (public.valid_store_setting('tagline', tagline)),
  short_description text check (public.valid_store_setting('short_description', short_description)),
  seo_description text check (public.valid_store_setting('seo_description', seo_description)),
  footer_description text check (public.valid_store_setting('footer_description', footer_description)),
  public_email text check (public.valid_store_setting('public_email', public_email)),
  public_phone text check (public.valid_store_setting('public_phone', public_phone)),
  whatsapp text check (public.valid_store_setting('whatsapp', whatsapp)),
  instagram_url text check (public.valid_store_setting('instagram_url', instagram_url)),
  facebook_url text check (public.valid_store_setting('facebook_url', facebook_url)),
  tiktok_url text check (public.valid_store_setting('tiktok_url', tiktok_url)),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.store_settings(singleton) values (true);
alter table public.store_settings enable row level security;
revoke all on table public.store_settings from public, anon, authenticated, service_role;
grant select on table public.store_settings to authenticated;
create policy store_settings_admin_read on public.store_settings for select to authenticated
using ((select public.is_admin()));

create function public.get_public_store_settings()
returns table (display_name text, tagline text, short_description text, seo_description text, footer_description text, public_email text, public_phone text, whatsapp text, instagram_url text, facebook_url text, tiktok_url text)
language sql stable security definer set search_path = '' as $$
  select s.display_name, s.tagline, s.short_description, s.seo_description, s.footer_description, s.public_email, s.public_phone, s.whatsapp, s.instagram_url, s.facebook_url, s.tiktok_url from public.store_settings s where s.singleton;
$$;
revoke all on function public.get_public_store_settings() from public, anon, authenticated, service_role;
grant execute on function public.get_public_store_settings() to anon, authenticated;

create function public.save_store_settings(p_display_name text, p_tagline text, p_short_description text, p_seo_description text, p_footer_description text, p_public_email text, p_public_phone text, p_whatsapp text, p_instagram_url text, p_facebook_url text, p_tiktok_url text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_admin() then
    return jsonb_build_object('success', false, 'code', 'unauthorized');
  end if;
  p_display_name := nullif(btrim(p_display_name), '');
  p_tagline := nullif(btrim(p_tagline), '');
  p_short_description := nullif(btrim(p_short_description), '');
  p_seo_description := nullif(btrim(p_seo_description), '');
  p_footer_description := nullif(btrim(p_footer_description), '');
  p_public_email := nullif(btrim(p_public_email), '');
  p_public_phone := nullif(btrim(p_public_phone), '');
  p_whatsapp := nullif(btrim(p_whatsapp), '');
  p_instagram_url := nullif(btrim(p_instagram_url), '');
  p_facebook_url := nullif(btrim(p_facebook_url), '');
  p_tiktok_url := nullif(btrim(p_tiktok_url), '');
  if not public.valid_store_setting('display_name', p_display_name)
    or not public.valid_store_setting('tagline', p_tagline)
    or not public.valid_store_setting('short_description', p_short_description)
    or not public.valid_store_setting('seo_description', p_seo_description)
    or not public.valid_store_setting('footer_description', p_footer_description)
    or not public.valid_store_setting('public_email', p_public_email)
    or not public.valid_store_setting('public_phone', p_public_phone)
    or not public.valid_store_setting('whatsapp', p_whatsapp)
    or not public.valid_store_setting('instagram_url', p_instagram_url)
    or not public.valid_store_setting('facebook_url', p_facebook_url)
    or not public.valid_store_setting('tiktok_url', p_tiktok_url) then
    return jsonb_build_object('success', false, 'code', 'invalid_request');
  end if;
  insert into public.store_settings(singleton, display_name, tagline, short_description, seo_description, footer_description, public_email, public_phone, whatsapp, instagram_url, facebook_url, tiktok_url, updated_by)
  values (true, p_display_name, p_tagline, p_short_description, p_seo_description, p_footer_description, p_public_email, p_public_phone, p_whatsapp, p_instagram_url, p_facebook_url, p_tiktok_url, auth.uid())
  on conflict (singleton) do update set
    display_name = excluded.display_name,
    tagline = excluded.tagline,
    short_description = excluded.short_description,
    seo_description = excluded.seo_description,
    footer_description = excluded.footer_description,
    public_email = excluded.public_email,
    public_phone = excluded.public_phone,
    whatsapp = excluded.whatsapp,
    instagram_url = excluded.instagram_url,
    facebook_url = excluded.facebook_url,
    tiktok_url = excluded.tiktok_url,
    updated_by = auth.uid(), updated_at = now();
  return jsonb_build_object('success', true, 'code', 'saved');
end;
$$;
revoke all on function public.save_store_settings(text,text,text,text,text,text,text,text,text,text,text) from public, anon, authenticated, service_role;
grant execute on function public.save_store_settings(text,text,text,text,text,text,text,text,text,text,text) to authenticated;
commit;
