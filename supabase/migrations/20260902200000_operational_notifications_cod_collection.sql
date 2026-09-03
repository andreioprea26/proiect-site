begin;

create type public.notification_type as enum (
  'order_confirmation',
  'payment_confirmation',
  'awaiting_customization_review',
  'in_progress',
  'ready',
  'shipped',
  'cancelled',
  'refunded'
);

create type public.notification_delivery_status as enum (
  'pending',
  'sending',
  'sent',
  'failed'
);

create table public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  notification_type public.notification_type not null,
  recipient text not null,
  provider text not null default 'resend'
    constraint notification_logs_provider_resend check (provider = 'resend'),
  status public.notification_delivery_status not null default 'pending',
  attempt_count integer not null default 0
    constraint notification_logs_attempt_count_valid check (attempt_count >= 0),
  provider_message_id text,
  last_error text,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  manual_resend_actor_id uuid references auth.users (id) on delete set null,
  source text not null,
  dedupe_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_logs_recipient_valid check (
    recipient = lower(btrim(recipient))
    and recipient ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    and length(recipient) <= 254
  ),
  constraint notification_logs_provider_message_valid check (
    provider_message_id is null or (
      provider_message_id = btrim(provider_message_id)
      and provider_message_id <> '' and length(provider_message_id) <= 255
    )
  ),
  constraint notification_logs_error_valid check (
    last_error is null or (
      last_error = btrim(last_error) and last_error <> ''
      and length(last_error) <= 1000
    )
  ),
  constraint notification_logs_source_valid check (
    source = lower(btrim(source))
    and source ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'
    and length(source) <= 80
  ),
  constraint notification_logs_dedupe_valid check (
    dedupe_key = btrim(dedupe_key)
    and dedupe_key ~ '^order:[0-9a-f-]{36}:[a-z_]+$'
    and length(dedupe_key) <= 160
  ),
  constraint notification_logs_status_consistent check (
    (status = 'pending' and attempt_count = 0 and provider_message_id is null
      and last_error is null and last_attempt_at is null and sent_at is null)
    or (status = 'sending' and attempt_count > 0 and last_attempt_at is not null
      and sent_at is null)
    or (status = 'sent' and attempt_count > 0 and provider_message_id is not null
      and last_error is null and last_attempt_at is not null and sent_at is not null)
    or (status = 'failed' and attempt_count > 0 and provider_message_id is null
      and last_error is not null and last_attempt_at is not null and sent_at is null)
  )
);

create index notification_logs_order_created_idx
  on public.notification_logs (order_id, created_at desc);
create index notification_logs_status_created_idx
  on public.notification_logs (status, created_at);

create table public.notification_attempts (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notification_logs (id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  request_id uuid not null unique,
  actor_user_id uuid references auth.users (id) on delete set null,
  status public.notification_delivery_status not null default 'sending'
    check (status in ('sending', 'sent', 'failed')),
  provider_message_id text,
  safe_error text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint notification_attempts_number_unique unique (notification_id, attempt_number),
  constraint notification_attempts_provider_message_valid check (
    provider_message_id is null or (
      provider_message_id = btrim(provider_message_id)
      and provider_message_id <> '' and length(provider_message_id) <= 255
    )
  ),
  constraint notification_attempts_error_valid check (
    safe_error is null or (
      safe_error = btrim(safe_error) and safe_error <> '' and length(safe_error) <= 1000
    )
  ),
  constraint notification_attempts_status_consistent check (
    (status = 'sending' and provider_message_id is null and safe_error is null and completed_at is null)
    or (status = 'sent' and provider_message_id is not null and safe_error is null and completed_at is not null)
    or (status = 'failed' and provider_message_id is null and safe_error is not null and completed_at is not null)
  )
);

create type public.cod_collection_status as enum ('unpaid', 'collected');

create table public.cod_collections (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  expected_amount_minor bigint not null check (expected_amount_minor >= 0),
  currency text not null default 'RON' check (currency = 'RON'),
  status public.cod_collection_status not null default 'unpaid',
  collected_at timestamptz,
  collected_by uuid references auth.users (id) on delete set null,
  collection_request_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cod_collections_status_consistent check (
    (status = 'unpaid' and collected_at is null and collected_by is null
      and collection_request_id is null)
    or (status = 'collected' and collected_at is not null and collected_by is not null
      and collection_request_id is not null)
  )
);

create table public.cod_collection_events (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.cod_collections (id) on delete restrict,
  order_id uuid not null references public.orders (id) on delete restrict,
  action text not null check (action = 'collected'),
  request_id uuid not null unique,
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null check (currency = 'RON'),
  created_at timestamptz not null default now(),
  constraint cod_collection_events_collection_order_unique unique (collection_id, order_id)
);

create trigger notification_logs_set_updated_at
before update on public.notification_logs
for each row execute function public.set_updated_at();

create trigger cod_collections_set_updated_at
before update on public.cod_collections
for each row execute function public.set_updated_at();

alter table public.notification_logs enable row level security;
alter table public.notification_attempts enable row level security;
alter table public.cod_collections enable row level security;
alter table public.cod_collection_events enable row level security;

revoke all on table public.notification_logs, public.notification_attempts,
  public.cod_collections, public.cod_collection_events from anon, authenticated;
grant select on table public.notification_logs, public.notification_attempts,
  public.cod_collections, public.cod_collection_events to authenticated;

create policy notification_logs_admin_select on public.notification_logs
for select to authenticated using ((select public.is_admin()));
create policy notification_attempts_admin_select on public.notification_attempts
for select to authenticated using ((select public.is_admin()));
create policy cod_collections_admin_select on public.cod_collections
for select to authenticated using ((select public.is_admin()));
create policy cod_collection_events_admin_select on public.cod_collection_events
for select to authenticated using ((select public.is_admin()));

create function public.create_cod_collection_for_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.payment_method = 'cash_on_delivery'::public.order_payment_method then
    insert into public.cod_collections (
      order_id, expected_amount_minor, currency, status
    ) values (
      new.id, new.total_minor, new.currency, 'unpaid'
    );
  end if;
  return new;
end;
$$;

revoke all on function public.create_cod_collection_for_order()
from public, anon, authenticated;

create trigger orders_create_cod_collection
after insert on public.orders
for each row execute function public.create_cod_collection_for_order();

insert into public.cod_collections (
  order_id, expected_amount_minor, currency, status,
  collected_at, collected_by, collection_request_id
)
select o.id, o.total_minor, o.currency, 'unpaid', null, null, null
from public.orders o
where o.payment_method = 'cash_on_delivery'
  and not exists (select 1 from public.cod_collections cc where cc.order_id = o.id);

create function public.collect_admin_cod_payment(
  p_order_id uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_collection public.cod_collections%rowtype;
  v_actor uuid := auth.uid();
  v_now timestamptz := statement_timestamp();
begin
  if v_actor is null or not public.is_admin() then
    return jsonb_build_object('success', false, 'code', 'unauthorized');
  end if;
  if p_order_id is null or p_request_id is null then
    return jsonb_build_object('success', false, 'code', 'invalid_collection');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 7));
  select cc.* into v_collection from public.cod_collections cc
  where cc.collection_request_id = p_request_id;
  if found then
    return jsonb_build_object(
      'success', true, 'idempotentReplay', true,
      'orderId', v_collection.order_id, 'collectionId', v_collection.id,
      'collectedAt', v_collection.collected_at
    );
  end if;

  select o.* into v_order from public.orders o
  where o.id = p_order_id for update;
  if not found then
    return jsonb_build_object('success', false, 'code', 'order_not_found');
  end if;
  if v_order.payment_method <> 'cash_on_delivery' then
    return jsonb_build_object('success', false, 'code', 'not_cod');
  end if;

  select cc.* into v_collection from public.cod_collections cc
  where cc.order_id = v_order.id for update;
  if not found then
    return jsonb_build_object('success', false, 'code', 'collection_missing');
  end if;
  if v_collection.expected_amount_minor <> v_order.total_minor
    or v_collection.currency <> v_order.currency
  then
    return jsonb_build_object('success', false, 'code', 'amount_mismatch');
  end if;
  if v_collection.status = 'collected' then
    return jsonb_build_object(
      'success', true, 'idempotentReplay', true,
      'orderId', v_order.id, 'collectionId', v_collection.id,
      'collectedAt', v_collection.collected_at
    );
  end if;
  if v_order.status in ('cancelled', 'refunded', 'returned') then
    return jsonb_build_object('success', false, 'code', 'order_not_collectible');
  end if;
  if v_order.payment_status <> 'unpaid' then
    return jsonb_build_object('success', false, 'code', 'financial_state_invalid');
  end if;

  update public.cod_collections set
    status = 'collected', collected_at = v_now, collected_by = v_actor,
    collection_request_id = p_request_id
  where id = v_collection.id returning * into v_collection;

  update public.orders set payment_status = 'paid'
  where id = v_order.id;

  insert into public.cod_collection_events (
    collection_id, order_id, action, request_id, actor_user_id,
    amount_minor, currency
  ) values (
    v_collection.id, v_order.id, 'collected', p_request_id, v_actor,
    v_collection.expected_amount_minor, v_collection.currency
  );

  return jsonb_build_object(
    'success', true, 'idempotentReplay', false,
    'orderId', v_order.id, 'collectionId', v_collection.id,
    'collectedAt', v_collection.collected_at
  );
end;
$$;

revoke all on function public.collect_admin_cod_payment(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.collect_admin_cod_payment(uuid, uuid)
to authenticated;

create function public.enqueue_order_notification(
  p_order_id uuid,
  p_notification_type public.notification_type,
  p_source text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_log public.notification_logs%rowtype;
  v_dedupe_key text;
  v_eligible boolean := false;
begin
  if auth.role() <> 'service_role' then
    return jsonb_build_object('success', false, 'code', 'service_role_required');
  end if;
  if p_order_id is null or p_notification_type is null
    or p_source is null or p_source <> lower(btrim(p_source))
    or p_source !~ '^[a-z0-9]+(?:_[a-z0-9]+)*$' or length(p_source) > 80
  then
    return jsonb_build_object('success', false, 'code', 'invalid_notification');
  end if;

  select o.* into v_order from public.orders o where o.id = p_order_id;
  if not found then
    return jsonb_build_object('success', false, 'code', 'order_not_found');
  end if;

  v_eligible := case p_notification_type
    when 'order_confirmation' then
      v_order.payment_method = 'cash_on_delivery'
      or v_order.payment_status in ('paid', 'refunded')
    when 'payment_confirmation' then v_order.payment_status in ('paid', 'refunded')
    when 'awaiting_customization_review' then exists (
      select 1 from public.order_status_history h where h.order_id = v_order.id
        and h.to_status = 'awaiting_customization_review'
    )
    when 'in_progress' then exists (
      select 1 from public.order_status_history h where h.order_id = v_order.id
        and h.to_status = 'in_progress'
    )
    when 'ready' then exists (
      select 1 from public.order_status_history h where h.order_id = v_order.id
        and h.to_status = 'ready'
    )
    when 'shipped' then exists (
      select 1 from public.shipments s where s.order_id = v_order.id
        and s.shipped_at is not null
    )
    when 'cancelled' then exists (
      select 1 from public.order_status_history h where h.order_id = v_order.id
        and h.to_status = 'cancelled'
    )
    when 'refunded' then v_order.status = 'refunded'
      and v_order.payment_status = 'refunded'
    else false
  end;
  if not v_eligible then
    return jsonb_build_object('success', false, 'code', 'notification_not_eligible');
  end if;

  v_dedupe_key := 'order:' || v_order.id::text || ':' || p_notification_type::text;
  insert into public.notification_logs (
    order_id, notification_type, recipient, source, dedupe_key
  ) values (
    v_order.id, p_notification_type, v_order.email, p_source, v_dedupe_key
  ) on conflict (dedupe_key) do nothing;

  select nl.* into v_log from public.notification_logs nl
  where nl.dedupe_key = v_dedupe_key;
  return jsonb_build_object(
    'success', true, 'notificationId', v_log.id, 'status', v_log.status,
    'created', v_log.created_at = v_log.updated_at
  );
end;
$$;

revoke all on function public.enqueue_order_notification(uuid, public.notification_type, text)
from public, anon, authenticated;
grant execute on function public.enqueue_order_notification(uuid, public.notification_type, text)
to service_role;

create function public.claim_notification_delivery(
  p_notification_id uuid,
  p_request_id uuid,
  p_actor_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_log public.notification_logs%rowtype;
  v_attempt public.notification_attempts%rowtype;
  v_attempt_number integer;
begin
  if auth.role() <> 'service_role' then
    return jsonb_build_object('success', false, 'code', 'service_role_required');
  end if;
  if p_notification_id is null or p_request_id is null then
    return jsonb_build_object('success', false, 'code', 'invalid_claim');
  end if;
  if p_actor_user_id is not null and not exists (
    select 1 from public.user_roles ur
    where ur.user_id = p_actor_user_id and ur.role = 'admin'
  ) then
    return jsonb_build_object('success', false, 'code', 'admin_required');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 8));
  select na.* into v_attempt from public.notification_attempts na
  where na.request_id = p_request_id;
  if found then
    return jsonb_build_object(
      'success', true, 'idempotentReplay', true, 'claimed', false,
      'attemptId', v_attempt.id, 'status', v_attempt.status
    );
  end if;

  select nl.* into v_log from public.notification_logs nl
  where nl.id = p_notification_id for update;
  if not found then
    return jsonb_build_object('success', false, 'code', 'notification_not_found');
  end if;
  if p_actor_user_id is null and v_log.status <> 'pending' then
    return jsonb_build_object(
      'success', true, 'idempotentReplay', true, 'claimed', false,
      'notificationId', v_log.id, 'status', v_log.status
    );
  end if;
  if p_actor_user_id is not null and v_log.status <> 'failed' then
    return jsonb_build_object('success', false, 'code', 'manual_retry_not_eligible');
  end if;

  v_attempt_number := v_log.attempt_count + 1;
  insert into public.notification_attempts (
    notification_id, attempt_number, request_id, actor_user_id
  ) values (
    v_log.id, v_attempt_number, p_request_id, p_actor_user_id
  ) returning * into v_attempt;

  update public.notification_logs set
    status = 'sending', attempt_count = v_attempt_number,
    provider_message_id = null, last_error = null,
    last_attempt_at = statement_timestamp(), sent_at = null,
    manual_resend_actor_id = p_actor_user_id
  where id = v_log.id;

  return jsonb_build_object(
    'success', true, 'idempotentReplay', false, 'claimed', true,
    'notificationId', v_log.id, 'attemptId', v_attempt.id,
    'attemptNumber', v_attempt_number, 'orderId', v_log.order_id,
    'notificationType', v_log.notification_type,
    'recipient', v_log.recipient
  );
end;
$$;

revoke all on function public.claim_notification_delivery(uuid, uuid, uuid)
from public, anon, authenticated;
grant execute on function public.claim_notification_delivery(uuid, uuid, uuid)
to service_role;

create function public.finish_notification_delivery(
  p_attempt_id uuid,
  p_sent boolean,
  p_provider_message_id text default null,
  p_safe_error text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.notification_attempts%rowtype;
begin
  if auth.role() <> 'service_role' then
    return jsonb_build_object('success', false, 'code', 'service_role_required');
  end if;
  if p_attempt_id is null or p_sent is null
    or (p_sent and (p_provider_message_id is null or btrim(p_provider_message_id) = ''))
    or (not p_sent and (p_safe_error is null or btrim(p_safe_error) = ''))
    or length(coalesce(p_provider_message_id, '')) > 255
    or length(coalesce(p_safe_error, '')) > 1000
  then
    return jsonb_build_object('success', false, 'code', 'invalid_completion');
  end if;

  select na.* into v_attempt from public.notification_attempts na
  where na.id = p_attempt_id for update;
  if not found then
    return jsonb_build_object('success', false, 'code', 'attempt_not_found');
  end if;
  if v_attempt.status <> 'sending' then
    return jsonb_build_object(
      'success', true, 'idempotentReplay', true, 'status', v_attempt.status
    );
  end if;

  update public.notification_attempts set
    status = (case when p_sent then 'sent' else 'failed' end)::public.notification_delivery_status,
    provider_message_id = case when p_sent then btrim(p_provider_message_id) else null end,
    safe_error = case when p_sent then null else left(btrim(p_safe_error), 1000) end,
    completed_at = statement_timestamp()
  where id = v_attempt.id;

  update public.notification_logs set
    status = (case when p_sent then 'sent' else 'failed' end)::public.notification_delivery_status,
    provider_message_id = case when p_sent then btrim(p_provider_message_id) else null end,
    last_error = case when p_sent then null else left(btrim(p_safe_error), 1000) end,
    sent_at = case when p_sent then statement_timestamp() else null end
  where id = v_attempt.notification_id;

  return jsonb_build_object(
    'success', true, 'idempotentReplay', false,
    'notificationId', v_attempt.notification_id,
    'status', case when p_sent then 'sent' else 'failed' end
  );
end;
$$;

revoke all on function public.finish_notification_delivery(uuid, boolean, text, text)
from public, anon, authenticated;
grant execute on function public.finish_notification_delivery(uuid, boolean, text, text)
to service_role;

commit;
