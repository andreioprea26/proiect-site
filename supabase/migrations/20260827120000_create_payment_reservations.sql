begin;

create type public.payment_record_status as enum (
  'pending',
  'paid',
  'failed',
  'expired',
  'refunded'
);

create type public.stock_reservation_status as enum (
  'active',
  'consumed',
  'released',
  'expired'
);

-- This is the single Development default changed by 6B when Checkout Session
-- duration is aligned. Keeping the TTL in the database avoids client clocks
-- and duplicated application constants.
create function public.stock_reservation_ttl()
returns interval
language sql
immutable
set search_path = ''
as $$
  select interval '30 minutes';
$$;

revoke all on function public.stock_reservation_ttl()
from public, anon, authenticated;
grant execute on function public.stock_reservation_ttl() to service_role;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique
    references public.orders (id) on delete cascade,
  provider text not null
    constraint payments_provider_valid
    check (
      provider = lower(btrim(provider))
      and provider ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'
    ),
  status public.payment_record_status not null default 'pending',
  amount_minor bigint not null
    constraint payments_amount_nonnegative check (amount_minor >= 0),
  currency text not null default 'RON'
    constraint payments_currency_ron check (currency = 'RON'),
  idempotency_key uuid not null unique,
  pending_expires_at timestamptz not null,
  provider_payment_id text,
  provider_checkout_session_id text,
  provider_customer_id text,
  confirmation_key text unique,
  failure_code text,
  failure_message text,
  metadata jsonb not null default '{}'::jsonb
    constraint payments_metadata_object check (jsonb_typeof(metadata) = 'object'),
  paid_at timestamptz,
  failed_at timestamptz,
  expired_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_id_order_unique unique (id, order_id),
  constraint payments_pending_expiry_after_creation
    check (pending_expires_at > created_at),
  constraint payments_provider_payment_id_valid check (
    provider_payment_id is null
    or (
      provider_payment_id = btrim(provider_payment_id)
      and provider_payment_id <> ''
      and length(provider_payment_id) <= 255
    )
  ),
  constraint payments_provider_session_id_valid check (
    provider_checkout_session_id is null
    or (
      provider_checkout_session_id = btrim(provider_checkout_session_id)
      and provider_checkout_session_id <> ''
      and length(provider_checkout_session_id) <= 255
    )
  ),
  constraint payments_provider_customer_id_valid check (
    provider_customer_id is null
    or (
      provider_customer_id = btrim(provider_customer_id)
      and provider_customer_id <> ''
      and length(provider_customer_id) <= 255
    )
  ),
  constraint payments_confirmation_key_valid check (
    confirmation_key is null
    or (
      confirmation_key = btrim(confirmation_key)
      and confirmation_key <> ''
      and length(confirmation_key) <= 255
    )
  ),
  constraint payments_failure_fields_valid check (
    (failure_code is null or (
      failure_code = btrim(failure_code)
      and failure_code <> ''
      and length(failure_code) <= 100
    ))
    and (failure_message is null or (
      failure_message = btrim(failure_message)
      and failure_message <> ''
      and length(failure_message) <= 1000
    ))
  ),
  constraint payments_status_timestamps_consistent check (
    (status = 'pending' and paid_at is null and failed_at is null
      and expired_at is null and refunded_at is null)
    or (status = 'paid' and paid_at is not null and failed_at is null
      and expired_at is null and refunded_at is null)
    or (status = 'failed' and paid_at is null and failed_at is not null
      and expired_at is null and refunded_at is null)
    or (status = 'expired' and paid_at is null and failed_at is null
      and expired_at is not null and refunded_at is null)
    or (status = 'refunded' and paid_at is not null and failed_at is null
      and expired_at is null and refunded_at is not null)
  )
);

create unique index payments_provider_payment_id_unique_idx
  on public.payments (provider, provider_payment_id)
  where provider_payment_id is not null;

create unique index payments_provider_session_id_unique_idx
  on public.payments (provider, provider_checkout_session_id)
  where provider_checkout_session_id is not null;

create index payments_status_created_at_idx
  on public.payments (status, created_at);

create table public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  payment_id uuid not null,
  inventory_id uuid not null references public.inventory (id) on delete restrict,
  quantity integer not null
    constraint stock_reservations_quantity_positive check (quantity > 0),
  status public.stock_reservation_status not null default 'active',
  request_idempotency_key uuid not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  released_at timestamptz,
  expired_at timestamptz,
  resolution_key text,
  metadata jsonb not null default '{}'::jsonb
    constraint stock_reservations_metadata_object
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_reservations_payment_order_fk
    foreign key (payment_id, order_id)
    references public.payments (id, order_id) on delete cascade,
  constraint stock_reservations_order_inventory_unique
    unique (order_id, inventory_id),
  constraint stock_reservations_request_inventory_unique
    unique (request_idempotency_key, inventory_id),
  constraint stock_reservations_expiry_after_creation
    check (expires_at > created_at),
  constraint stock_reservations_resolution_key_valid check (
    resolution_key is null
    or (
      resolution_key = btrim(resolution_key)
      and resolution_key <> ''
      and length(resolution_key) <= 255
    )
  ),
  constraint stock_reservations_status_timestamps_consistent check (
    (status = 'active' and consumed_at is null and released_at is null
      and expired_at is null and resolution_key is null)
    or (status = 'consumed' and consumed_at is not null
      and released_at is null and expired_at is null
      and resolution_key is not null)
    or (status = 'released' and consumed_at is null
      and released_at is not null and expired_at is null
      and resolution_key is not null)
    or (status = 'expired' and consumed_at is null
      and released_at is null and expired_at is not null)
  )
);

create index stock_reservations_inventory_active_idx
  on public.stock_reservations (inventory_id, expires_at)
  where status = 'active';

create index stock_reservations_order_status_idx
  on public.stock_reservations (order_id, status);

create index stock_reservations_expiry_idx
  on public.stock_reservations (expires_at, order_id)
  where status = 'active';

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create trigger stock_reservations_set_updated_at
before update on public.stock_reservations
for each row execute function public.set_updated_at();

alter table public.payments enable row level security;
alter table public.stock_reservations enable row level security;

revoke all on table public.payments, public.stock_reservations
from anon, authenticated;
grant select on table public.payments, public.stock_reservations
to authenticated;

create policy payments_admin_select
on public.payments
for select
to authenticated
using ((select public.is_admin()));

create policy stock_reservations_admin_select
on public.stock_reservations
for select
to authenticated
using ((select public.is_admin()));

-- The reservation row itself owns the locking/checking invariant. This keeps
-- correctness in the database even if a future trusted integration inserts a
-- hold without going through prepare_card_order.
create function public.protect_stock_reservation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_physical_quantity integer;
  v_other_reserved bigint;
begin
  if new.status <> 'active'::public.stock_reservation_status then
    return new;
  end if;

  if new.expires_at <= statement_timestamp() then
    raise exception 'An active reservation must expire in the future.'
      using errcode = '23514';
  end if;

  select i.quantity into v_physical_quantity
  from public.inventory i
  where i.id = new.inventory_id
  for update;
  if not found then
    raise exception 'Reservation inventory does not exist.'
      using errcode = '23503';
  end if;

  select coalesce(sum(sr.quantity), 0)
  into v_other_reserved
  from public.stock_reservations sr
  where sr.inventory_id = new.inventory_id
    and sr.id is distinct from new.id
    and sr.status = 'active'::public.stock_reservation_status
    and sr.expires_at > statement_timestamp();

  if v_other_reserved + new.quantity::bigint > v_physical_quantity::bigint then
    raise exception 'Reservation exceeds effective available inventory.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger stock_reservations_protect_inventory
before insert or update of inventory_id, quantity, status, expires_at
on public.stock_reservations
for each row execute function public.protect_stock_reservation();

-- Every inventory writer already locks the inventory row. This trigger is the
-- final invariant protecting quantities reserved by a concurrent card order,
-- including writes through the existing COD and admin adjustment paths.
create function public.protect_reserved_inventory()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_reserved_quantity bigint;
begin
  select coalesce(sum(sr.quantity), 0)
  into v_reserved_quantity
  from public.stock_reservations sr
  where sr.inventory_id = new.id
    and sr.status = 'active'::public.stock_reservation_status
    and sr.expires_at > statement_timestamp();

  if new.quantity::bigint < v_reserved_quantity then
    raise exception 'Inventory quantity cannot be reduced below active reservations.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger inventory_protect_active_reservations
before update of quantity on public.inventory
for each row execute function public.protect_reserved_inventory();

-- Preserve the complete Phase 5 catalog/configuration validator and wrap it
-- with reservation-aware availability. The inner function is no longer a
-- public RPC.
alter function public.quote_checkout(jsonb)
  rename to quote_checkout_without_reservations;

revoke all on function public.quote_checkout_without_reservations(jsonb)
from public, anon, authenticated;

create function public.quote_checkout(p_lines jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote jsonb;
  v_line jsonb;
  v_errors jsonb;
  v_inventory public.inventory%rowtype;
  v_reserved_quantity bigint;
  v_requested_quantity integer;
  v_checked_inventory_ids uuid[] := '{}'::uuid[];
begin
  v_quote := public.quote_checkout_without_reservations(p_lines);
  if not coalesce((v_quote->>'valid')::boolean, false) then
    return v_quote;
  end if;

  v_errors := coalesce(v_quote->'errors', '[]'::jsonb);
  for v_line in select value from jsonb_array_elements(v_quote->'lines')
  loop
    v_inventory := null;

    if nullif(v_line->'variant', 'null'::jsonb) is not null then
      select i.* into v_inventory
      from public.inventory i
      where i.variant_id = (v_line#>>'{variant,id}')::uuid;
    else
      select i.* into v_inventory
      from public.inventory i
      where i.product_id = (v_line->>'productId')::uuid;
    end if;

    if v_inventory.id is not null
      and not (v_inventory.id = any(v_checked_inventory_ids))
    then
      select coalesce(sum(sr.quantity), 0)
      into v_reserved_quantity
      from public.stock_reservations sr
      where sr.inventory_id = v_inventory.id
        and sr.status = 'active'::public.stock_reservation_status
        and sr.expires_at > statement_timestamp();

      select sum((q->>'quantity')::integer)::integer
      into v_requested_quantity
      from jsonb_array_elements(v_quote->'lines') q
      where (
        v_inventory.variant_id is not null
        and nullif(q->'variant', 'null'::jsonb) is not null
        and v_inventory.variant_id = (q#>>'{variant,id}')::uuid
      ) or (
        v_inventory.product_id is not null
        and nullif(q->'variant', 'null'::jsonb) is null
        and v_inventory.product_id = (q->>'productId')::uuid
      );

      if v_inventory.quantity::bigint - v_reserved_quantity
        < v_requested_quantity::bigint
      then
        v_errors := v_errors || jsonb_build_array(jsonb_build_object(
          'key', v_line->>'key',
          'code', 'insufficient_stock',
          'message', 'Cantitatea solicitată nu mai este disponibilă.'
        ));
      end if;

      v_checked_inventory_ids := array_append(
        v_checked_inventory_ids,
        v_inventory.id
      );
    end if;
  end loop;

  return jsonb_set(
    jsonb_set(v_quote, '{errors}', v_errors, true),
    '{valid}',
    to_jsonb(jsonb_array_length(v_errors) = 0),
    true
  );
end;
$$;

revoke all on function public.quote_checkout(jsonb) from public;
grant execute on function public.quote_checkout(jsonb) to anon, authenticated;

create function public.prepare_card_order(
  p_idempotency_key uuid,
  p_lines jsonb,
  p_checkout jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_phone text;
  v_customer_type public.checkout_customer_type;
  v_company_name text;
  v_company_tax_id text;
  v_company_registration_number text;
  v_shipping_address jsonb;
  v_billing_address jsonb;
  v_billing_same boolean;
  v_shipping_method_id uuid;
  v_shipping public.shipping_methods%rowtype;
  v_fingerprint jsonb;
  v_existing public.orders%rowtype;
  v_existing_payment public.payments%rowtype;
  v_initial_quote jsonb;
  v_quote jsonb;
  v_quote_line jsonb;
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
  v_inventory public.inventory%rowtype;
  v_quantity integer;
  v_reserved_quantity bigint;
  v_variant_id uuid;
  v_expires_at timestamptz := statement_timestamp()
    + public.stock_reservation_ttl();
begin
  if p_idempotency_key is null then
    return jsonb_build_object(
      'success', false,
      'code', 'invalid_idempotency_key',
      'message', 'Reîncarcă pagina de checkout și încearcă din nou.'
    );
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 0));

  if p_checkout is null or jsonb_typeof(p_checkout) <> 'object' then
    return jsonb_build_object(
      'success', false,
      'code', 'invalid_checkout',
      'message', 'Datele de checkout nu sunt valide.'
    );
  end if;

  v_email := lower(btrim(coalesce(p_checkout->>'email', '')));
  v_phone := btrim(coalesce(p_checkout->>'phone', ''));
  if coalesce(p_checkout->>'customerType', '') = 'individual' then
    v_customer_type := 'individual'::public.checkout_customer_type;
  elsif p_checkout->>'customerType' = 'company' then
    v_customer_type := 'company'::public.checkout_customer_type;
  else
    return jsonb_build_object(
      'success', false,
      'code', 'invalid_customer_type',
      'message', 'Tipul de client nu este valid.'
    );
  end if;

  v_company_name := nullif(btrim(coalesce(p_checkout->>'companyName', '')), '');
  v_company_tax_id := nullif(btrim(coalesce(p_checkout->>'companyTaxId', '')), '');
  v_company_registration_number := nullif(
    btrim(coalesce(p_checkout->>'companyRegistrationNumber', '')),
    ''
  );
  if coalesce(p_checkout->>'billingSameAsShipping', '') not in ('true', 'false') then
    return jsonb_build_object(
      'success', false,
      'code', 'invalid_billing_choice',
      'message', 'Opțiunea de facturare nu este validă.'
    );
  end if;
  v_billing_same := (p_checkout->>'billingSameAsShipping')::boolean;
  v_shipping_address := jsonb_build_object(
    'recipientName', btrim(coalesce(p_checkout#>>'{shippingAddress,recipientName}', '')),
    'phone', btrim(coalesce(p_checkout#>>'{shippingAddress,phone}', '')),
    'addressLine1', btrim(coalesce(p_checkout#>>'{shippingAddress,addressLine1}', '')),
    'addressLine2', btrim(coalesce(p_checkout#>>'{shippingAddress,addressLine2}', '')),
    'city', btrim(coalesce(p_checkout#>>'{shippingAddress,city}', '')),
    'county', btrim(coalesce(p_checkout#>>'{shippingAddress,county}', '')),
    'postalCode', btrim(coalesce(p_checkout#>>'{shippingAddress,postalCode}', '')),
    'countryCode', upper(btrim(coalesce(p_checkout#>>'{shippingAddress,countryCode}', '')))
  );
  v_billing_address := case when v_billing_same then v_shipping_address else
    jsonb_build_object(
      'recipientName', btrim(coalesce(p_checkout#>>'{billingAddress,recipientName}', '')),
      'phone', btrim(coalesce(p_checkout#>>'{billingAddress,phone}', '')),
      'addressLine1', btrim(coalesce(p_checkout#>>'{billingAddress,addressLine1}', '')),
      'addressLine2', btrim(coalesce(p_checkout#>>'{billingAddress,addressLine2}', '')),
      'city', btrim(coalesce(p_checkout#>>'{billingAddress,city}', '')),
      'county', btrim(coalesce(p_checkout#>>'{billingAddress,county}', '')),
      'postalCode', btrim(coalesce(p_checkout#>>'{billingAddress,postalCode}', '')),
      'countryCode', upper(btrim(coalesce(p_checkout#>>'{billingAddress,countryCode}', '')))
    )
  end;

  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or length(v_email) > 254
    or v_phone = ''
    or length(v_phone) > 30
    or not public.is_valid_checkout_address(v_shipping_address)
    or not public.is_valid_checkout_address(v_billing_address)
  then
    return jsonb_build_object(
      'success', false,
      'code', 'invalid_checkout',
      'message', 'Verifică datele de contact, livrare și facturare.'
    );
  end if;

  if v_customer_type = 'individual'::public.checkout_customer_type then
    v_company_name := null;
    v_company_tax_id := null;
    v_company_registration_number := null;
  elsif v_company_name is null
    or length(v_company_name) > 200
    or v_company_tax_id is null
    or length(v_company_tax_id) > 50
    or length(coalesce(v_company_registration_number, '')) > 80
  then
    return jsonb_build_object(
      'success', false,
      'code', 'invalid_company',
      'message', 'Datele companiei nu sunt valide.'
    );
  end if;

  if p_checkout->>'paymentMethod' <> 'card' then
    return jsonb_build_object(
      'success', false,
      'code', 'payment_method_unavailable',
      'message', 'Operația pregătește numai comenzi cu plata online.'
    );
  end if;

  if coalesce(p_checkout->>'shippingMethodId', '') !~
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
  then
    return jsonb_build_object(
      'success', false,
      'code', 'shipping_unavailable',
      'message', 'Metoda de livrare nu mai este disponibilă.'
    );
  end if;
  v_shipping_method_id := (p_checkout->>'shippingMethodId')::uuid;

  v_fingerprint := jsonb_build_object(
    'userId', v_user_id,
    'email', v_email,
    'phone', v_phone,
    'customerType', v_customer_type,
    'companyName', v_company_name,
    'companyTaxId', v_company_tax_id,
    'companyRegistrationNumber', v_company_registration_number,
    'shippingAddress', v_shipping_address,
    'billingSameAsShipping', v_billing_same,
    'billingAddress', v_billing_address,
    'shippingMethodId', v_shipping_method_id,
    'paymentMethod', 'card',
    'lines', p_lines
  );

  select o.* into v_existing
  from public.orders o
  where o.idempotency_key = p_idempotency_key;

  if found then
    if v_existing.request_fingerprint <> v_fingerprint
      or v_existing.payment_method <> 'card'::public.order_payment_method
    then
      return jsonb_build_object(
        'success', false,
        'code', 'idempotency_conflict',
        'message', 'Această încercare de comandă a fost deja folosită cu alte date.'
      );
    end if;

    select p.* into v_existing_payment
    from public.payments p
    where p.order_id = v_existing.id;
    if not found then
      raise exception 'Idempotent card order is missing its payment.'
        using errcode = '23514';
    end if;

    return jsonb_build_object(
      'success', true,
      'idempotentReplay', true,
      'orderId', v_existing.id,
      'publicNumber', v_existing.public_number,
      'confirmationToken', v_existing.confirmation_token,
      'paymentId', v_existing_payment.id,
      'paymentStatus', v_existing_payment.status,
      'reservationExpiresAt', v_existing_payment.pending_expires_at,
      'subtotalMinor', v_existing.subtotal_minor,
      'shippingMinor', v_existing.shipping_minor,
      'totalMinor', v_existing.total_minor,
      'currency', v_existing.currency
    );
  end if;

  v_initial_quote := public.quote_checkout(p_lines);
  if not coalesce((v_initial_quote->>'valid')::boolean, false) then
    return jsonb_build_object(
      'success', false,
      'code', 'cart_invalid',
      'message', 'Coșul s-a schimbat. Verifică produsele înainte de a continua.',
      'quote', v_initial_quote
    );
  end if;

  perform p.id
  from public.products p
  join jsonb_array_elements(v_initial_quote->'lines') q
    on p.id = (q->>'productId')::uuid
  order by p.id
  for update of p;

  perform pv.id
  from public.product_variants pv
  join jsonb_array_elements(v_initial_quote->'lines') q
    on nullif(q->'variant', 'null'::jsonb) is not null
    and pv.id = (q#>>'{variant,id}')::uuid
  order by pv.id
  for update of pv;

  perform co.id
  from public.customization_options co
  where co.id in (
    select (ci->>'id')::uuid
    from jsonb_array_elements(p_lines) li
    cross join jsonb_array_elements(coalesce(li->'customizations', '[]'::jsonb)) ci
  )
  order by co.id
  for update of co;

  select sm.* into v_shipping
  from public.shipping_methods sm
  where sm.id = v_shipping_method_id and sm.is_active
  for update;
  if not found then
    return jsonb_build_object(
      'success', false,
      'code', 'shipping_unavailable',
      'message', 'Metoda de livrare nu mai este disponibilă.'
    );
  end if;

  perform i.id
  from public.inventory i
  where exists (
    select 1
    from jsonb_array_elements(v_initial_quote->'lines') q
    where (
      nullif(q->'variant', 'null'::jsonb) is not null
      and i.variant_id = (q#>>'{variant,id}')::uuid
    ) or (
      nullif(q->'variant', 'null'::jsonb) is null
      and i.product_id = (q->>'productId')::uuid
    )
  )
  order by i.id
  for update of i;

  v_quote := public.quote_checkout(p_lines);
  if not coalesce((v_quote->>'valid')::boolean, false) then
    return jsonb_build_object(
      'success', false,
      'code', 'cart_invalid',
      'message', 'Coșul s-a schimbat. Verifică produsele înainte de a continua.',
      'quote', v_quote
    );
  end if;

  for v_inventory in
    select i.*
    from public.inventory i
    where exists (
      select 1 from jsonb_array_elements(v_quote->'lines') q
      where (nullif(q->'variant', 'null'::jsonb) is not null
          and i.variant_id = (q#>>'{variant,id}')::uuid)
        or (nullif(q->'variant', 'null'::jsonb) is null
          and i.product_id = (q->>'productId')::uuid)
    )
  loop
    select sum((q->>'quantity')::integer)::integer into v_quantity
    from jsonb_array_elements(v_quote->'lines') q
    where (nullif(q->'variant', 'null'::jsonb) is not null
        and v_inventory.variant_id = (q#>>'{variant,id}')::uuid)
      or (nullif(q->'variant', 'null'::jsonb) is null
        and v_inventory.product_id = (q->>'productId')::uuid);

    select coalesce(sum(sr.quantity), 0)
    into v_reserved_quantity
    from public.stock_reservations sr
    where sr.inventory_id = v_inventory.id
      and sr.status = 'active'::public.stock_reservation_status
      and sr.expires_at > statement_timestamp();

    if v_inventory.quantity::bigint - v_reserved_quantity
      < v_quantity::bigint
    then
      return jsonb_build_object(
        'success', false,
        'code', 'insufficient_stock',
        'message', 'Cantitatea totală solicitată nu mai este disponibilă.'
      );
    end if;
  end loop;

  if exists (
    select 1
    from jsonb_array_elements(v_quote->'lines') q
    where q->>'productType' = 'unique'
      and not exists (
        select 1 from public.inventory i
        where (nullif(q->'variant', 'null'::jsonb) is not null
            and i.variant_id = (q#>>'{variant,id}')::uuid)
          or (nullif(q->'variant', 'null'::jsonb) is null
            and i.product_id = (q->>'productId')::uuid)
      )
  ) then
    return jsonb_build_object(
      'success', false,
      'code', 'unique_stock_unavailable',
      'message', 'Produsul unicat nu are un stoc disponibil verificabil.'
    );
  end if;

  insert into public.orders (
    idempotency_key, request_fingerprint, user_id, email, phone,
    customer_type, company_name, company_tax_id,
    company_registration_number, shipping_address,
    billing_same_as_shipping, billing_address, shipping_method_id,
    shipping_method_code, shipping_method_name, payment_method,
    payment_status, status, subtotal_minor, shipping_minor,
    total_minor, currency
  ) values (
    p_idempotency_key, v_fingerprint, v_user_id, v_email, v_phone,
    v_customer_type, v_company_name, v_company_tax_id,
    v_company_registration_number, v_shipping_address,
    v_billing_same, v_billing_address, v_shipping.id,
    v_shipping.code, v_shipping.name, 'card', 'pending',
    'awaiting_payment', (v_quote->>'subtotalMinor')::bigint,
    v_shipping.price_minor,
    (v_quote->>'subtotalMinor')::bigint + v_shipping.price_minor,
    'RON'
  ) returning * into v_order;

  insert into public.order_status_history (
    order_id, from_status, to_status, actor_user_id, note
  ) values (
    v_order.id, null, 'awaiting_payment', v_user_id,
    'Comandă cu plată online pregătită; confirmarea plății este în așteptare.'
  );

  for v_quote_line in
    select value from jsonb_array_elements(v_quote->'lines')
  loop
    v_variant_id := case
      when nullif(v_quote_line->'variant', 'null'::jsonb) is null then null
      else (v_quote_line#>>'{variant,id}')::uuid
    end;

    insert into public.order_items (
      order_id, product_id, variant_id, product_name, product_slug,
      variant_snapshot, customizations_snapshot, unit_base_price_minor,
      customization_total_minor, unit_price_minor, quantity,
      line_subtotal_minor
    ) values (
      v_order.id, (v_quote_line->>'productId')::uuid, v_variant_id,
      v_quote_line->>'name', v_quote_line->>'slug',
      nullif(v_quote_line->'variant', 'null'::jsonb),
      v_quote_line->'customizations',
      (v_quote_line->>'basePriceMinor')::bigint,
      (v_quote_line->>'customizationTotalMinor')::bigint,
      (v_quote_line->>'unitPriceMinor')::bigint,
      (v_quote_line->>'quantity')::integer,
      (v_quote_line->>'lineSubtotalMinor')::bigint
    );
  end loop;

  insert into public.payments (
    order_id, provider, status, amount_minor, currency,
    idempotency_key, pending_expires_at, metadata
  ) values (
    v_order.id, 'internal', 'pending', v_order.total_minor,
    v_order.currency, p_idempotency_key, v_expires_at,
    jsonb_build_object('source', 'prepare_card_order')
  ) returning * into v_payment;

  insert into public.stock_reservations (
    order_id, payment_id, inventory_id, quantity, status,
    request_idempotency_key, expires_at, metadata
  )
  select
    v_order.id,
    v_payment.id,
    i.id,
    sum((q->>'quantity')::integer)::integer,
    'active'::public.stock_reservation_status,
    p_idempotency_key,
    v_expires_at,
    jsonb_build_object(
      'publicNumber', v_order.public_number,
      'source', 'prepare_card_order'
    )
  from jsonb_array_elements(v_quote->'lines') q
  join public.inventory i on (
    (nullif(q->'variant', 'null'::jsonb) is not null
      and i.variant_id = (q#>>'{variant,id}')::uuid)
    or (nullif(q->'variant', 'null'::jsonb) is null
      and i.product_id = (q->>'productId')::uuid)
  )
  group by i.id;

  return jsonb_build_object(
    'success', true,
    'idempotentReplay', false,
    'orderId', v_order.id,
    'publicNumber', v_order.public_number,
    'confirmationToken', v_order.confirmation_token,
    'paymentId', v_payment.id,
    'paymentStatus', v_payment.status,
    'reservationExpiresAt', v_expires_at,
    'subtotalMinor', v_order.subtotal_minor,
    'shippingMinor', v_order.shipping_minor,
    'totalMinor', v_order.total_minor,
    'currency', v_order.currency
  );
end;
$$;

revoke all on function public.prepare_card_order(uuid, jsonb, jsonb)
from public;
grant execute on function public.prepare_card_order(uuid, jsonb, jsonb)
to anon, authenticated;

create function public.release_card_order_reservations(
  p_order_id uuid,
  p_resolution_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
  v_active_count integer;
begin
  if p_order_id is null
    or p_resolution_key is null
    or p_resolution_key <> btrim(p_resolution_key)
    or p_resolution_key = ''
    or length(p_resolution_key) > 255
  then
    return jsonb_build_object('success', false, 'code', 'invalid_release');
  end if;

  select o.* into v_order
  from public.orders o
  where o.id = p_order_id and o.payment_method = 'card'
  for update;
  if not found then
    return jsonb_build_object('success', false, 'code', 'order_not_found');
  end if;

  select p.* into v_payment
  from public.payments p
  where p.order_id = v_order.id
  for update;
  if not found then
    return jsonb_build_object('success', false, 'code', 'payment_not_found');
  end if;

  perform sr.id
  from public.stock_reservations sr
  where sr.order_id = v_order.id
  order by sr.inventory_id
  for update;

  if exists (
    select 1 from public.stock_reservations sr
    where sr.order_id = v_order.id and sr.status = 'consumed'
  ) or v_payment.status in ('paid', 'refunded')
  then
    return jsonb_build_object(
      'success', false,
      'code', 'reservation_already_consumed'
    );
  end if;

  select count(*) into v_active_count
  from public.stock_reservations sr
  where sr.order_id = v_order.id and sr.status = 'active';

  if v_active_count = 0
    and (v_payment.status <> 'pending' or v_order.status <> 'awaiting_payment')
  then
    return jsonb_build_object(
      'success', true,
      'idempotentReplay', true,
      'orderId', v_order.id,
      'paymentId', v_payment.id
    );
  end if;

  perform i.id
  from public.inventory i
  join public.stock_reservations sr on sr.inventory_id = i.id
  where sr.order_id = v_order.id and sr.status = 'active'
  order by i.id
  for update of i;

  update public.stock_reservations
  set status = 'released',
      released_at = statement_timestamp(),
      resolution_key = p_resolution_key
  where order_id = v_order.id and status = 'active';

  if v_payment.status = 'pending' then
    update public.payments
    set status = 'failed',
        failed_at = statement_timestamp(),
        failure_code = 'reservation_released',
        failure_message = 'Rezervarea a fost eliberată înainte de confirmarea plății.'
    where id = v_payment.id;
  end if;

  if v_order.status = 'awaiting_payment' then
    update public.orders set status = 'cancelled' where id = v_order.id;
    insert into public.order_status_history (
      order_id, from_status, to_status, note
    ) values (
      v_order.id, 'awaiting_payment', 'cancelled',
      'Rezervarea plății online a fost eliberată.'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'idempotentReplay', false,
    'orderId', v_order.id,
    'paymentId', v_payment.id,
    'releasedReservations', v_active_count
  );
end;
$$;

revoke all on function public.release_card_order_reservations(uuid, text)
from public, anon, authenticated;
grant execute on function public.release_card_order_reservations(uuid, text)
to service_role;

create function public.expire_stock_reservations(
  p_as_of timestamptz default statement_timestamp()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_expired_reservations integer := 0;
  v_expired_orders integer := 0;
  v_changed integer;
begin
  if p_as_of is null then
    return jsonb_build_object('success', false, 'code', 'invalid_expiration_time');
  end if;

  for v_order_id in
    select p.order_id
    from public.payments p
    join public.orders o on o.id = p.order_id
    where p.status = 'pending'
      and p.pending_expires_at <= p_as_of
      and o.status = 'awaiting_payment'
    order by p.order_id
  loop
    perform o.id from public.orders o
    where o.id = v_order_id for update;
    perform p.id from public.payments p
    where p.order_id = v_order_id for update;
    perform sr.id from public.stock_reservations sr
    where sr.order_id = v_order_id
    order by sr.inventory_id for update;
    perform i.id
    from public.inventory i
    join public.stock_reservations sr on sr.inventory_id = i.id
    where sr.order_id = v_order_id and sr.status = 'active'
    order by i.id for update of i;

    update public.stock_reservations
    set status = 'expired', expired_at = p_as_of
    where order_id = v_order_id
      and status = 'active';
    get diagnostics v_changed = row_count;
    v_expired_reservations := v_expired_reservations + v_changed;

    update public.payments
    set status = 'expired', expired_at = p_as_of
    where order_id = v_order_id and status = 'pending';

    update public.orders
    set status = 'cancelled'
    where id = v_order_id and status = 'awaiting_payment';
    if found then
      v_expired_orders := v_expired_orders + 1;
      insert into public.order_status_history (
        order_id, from_status, to_status, note
      ) values (
        v_order_id, 'awaiting_payment', 'cancelled',
        'Rezervarea plății online a expirat.'
      );
    end if;
  end loop;

  return jsonb_build_object(
    'success', true,
    'expiredReservations', v_expired_reservations,
    'expiredOrders', v_expired_orders
  );
end;
$$;

revoke all on function public.expire_stock_reservations(timestamptz)
from public, anon, authenticated;
grant execute on function public.expire_stock_reservations(timestamptz)
to service_role;

create function public.confirm_card_payment(
  p_payment_id uuid,
  p_confirmation_key text,
  p_provider text default 'internal'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
  v_order_id uuid;
  v_inventory public.inventory%rowtype;
  v_reservation public.stock_reservations%rowtype;
  v_quantity_before integer;
  v_now timestamptz := statement_timestamp();
begin
  if p_payment_id is null
    or p_confirmation_key is null
    or p_confirmation_key <> btrim(p_confirmation_key)
    or p_confirmation_key = ''
    or length(p_confirmation_key) > 255
    or p_provider is null
    or p_provider <> lower(btrim(p_provider))
    or p_provider !~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'
  then
    return jsonb_build_object('success', false, 'code', 'invalid_confirmation');
  end if;

  select p.order_id into v_order_id
  from public.payments p
  where p.id = p_payment_id;
  if not found then
    return jsonb_build_object('success', false, 'code', 'payment_not_found');
  end if;

  select o.* into v_order
  from public.orders o
  where o.id = v_order_id
  for update;

  select p.* into v_payment
  from public.payments p
  where p.id = p_payment_id and p.order_id = v_order.id
  for update;
  if not found then
    return jsonb_build_object('success', false, 'code', 'payment_not_found');
  end if;

  if v_payment.status in ('paid', 'refunded') then
    if v_payment.confirmation_key is distinct from p_confirmation_key then
      return jsonb_build_object(
        'success', false,
        'code', 'confirmation_conflict'
      );
    end if;
    return jsonb_build_object(
      'success', true,
      'idempotentReplay', true,
      'orderId', v_order.id,
      'paymentId', v_payment.id
    );
  end if;

  if v_payment.status <> 'pending'
    or v_order.status <> 'awaiting_payment'
  then
    return jsonb_build_object(
      'success', false,
      'code', 'payment_not_confirmable'
    );
  end if;

  -- Match the product/variant-before-inventory order used by COD preparation
  -- so a unique-product availability update cannot deadlock with a checkout.
  perform p.id
  from public.products p
  where exists (
    select 1
    from public.stock_reservations sr
    join public.inventory i on i.id = sr.inventory_id
    left join public.product_variants pv on pv.id = i.variant_id
    where sr.order_id = v_order.id
      and coalesce(i.product_id, pv.product_id) = p.id
  )
  order by p.id
  for update;

  perform pv.id
  from public.product_variants pv
  where exists (
    select 1
    from public.stock_reservations sr
    join public.inventory i on i.id = sr.inventory_id
    where sr.order_id = v_order.id and i.variant_id = pv.id
  )
  order by pv.id
  for update;

  perform sr.id
  from public.stock_reservations sr
  where sr.order_id = v_order.id
  order by sr.inventory_id
  for update;

  if exists (
    select 1 from public.stock_reservations sr
    where sr.order_id = v_order.id
      and (
        sr.status <> 'active'
        or sr.expires_at <= v_now
      )
  ) then
    return jsonb_build_object(
      'success', false,
      'code', 'reservation_not_consumable'
    );
  end if;

  perform i.id
  from public.inventory i
  join public.stock_reservations sr on sr.inventory_id = i.id
  where sr.order_id = v_order.id and sr.status = 'active'
  order by i.id
  for update of i;

  -- Mark first inside the same transaction so the inventory invariant ignores
  -- this payment's own reservations while retaining every other active hold.
  update public.stock_reservations
  set status = 'consumed',
      consumed_at = v_now,
      resolution_key = p_confirmation_key
  where order_id = v_order.id and status = 'active';

  for v_reservation in
    select sr.*
    from public.stock_reservations sr
    where sr.order_id = v_order.id
      and sr.status = 'consumed'
      and sr.resolution_key = p_confirmation_key
    order by sr.inventory_id
  loop
    select i.* into v_inventory
    from public.inventory i
    where i.id = v_reservation.inventory_id;

    v_quantity_before := v_inventory.quantity;
    update public.inventory
    set quantity = quantity - v_reservation.quantity
    where id = v_inventory.id
      and quantity >= v_reservation.quantity
    returning * into v_inventory;
    if not found then
      raise exception 'Reserved inventory cannot be consumed without sufficient stock.'
        using errcode = '23514';
    end if;

    insert into public.inventory_movements (
      inventory_id, quantity_delta, quantity_before, quantity_after,
      reason, context
    ) values (
      v_inventory.id,
      -v_reservation.quantity,
      v_quantity_before,
      v_inventory.quantity,
      'Consumare rezervare plată online',
      jsonb_build_object(
        'orderId', v_order.id,
        'publicNumber', v_order.public_number,
        'paymentId', v_payment.id,
        'reservationId', v_reservation.id,
        'source', 'confirm_card_payment'
      )
    );

    if v_inventory.quantity = 0 then
      update public.products p
      set availability_status = 'unavailable'
      where p.product_type = 'unique'
        and (
          p.id = v_inventory.product_id
          or exists (
            select 1 from public.product_variants pv
            where pv.id = v_inventory.variant_id and pv.product_id = p.id
          )
        );
    end if;
  end loop;

  update public.payments
  set provider = p_provider,
      status = 'paid',
      confirmation_key = p_confirmation_key,
      paid_at = v_now,
      failure_code = null,
      failure_message = null
  where id = v_payment.id;

  update public.orders
  set payment_status = 'paid', status = 'paid'
  where id = v_order.id;

  insert into public.order_status_history (
    order_id, from_status, to_status, note
  ) values (
    v_order.id, 'awaiting_payment', 'paid',
    'Plata online a fost confirmată intern.'
  );

  return jsonb_build_object(
    'success', true,
    'idempotentReplay', false,
    'orderId', v_order.id,
    'paymentId', v_payment.id
  );
end;
$$;

revoke all on function public.confirm_card_payment(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.confirm_card_payment(uuid, text, text)
to service_role;

commit;
