begin;

alter table public.orders
  add column request_fingerprint jsonb not null,
  add column confirmation_token uuid not null default gen_random_uuid();

alter table public.orders
  add constraint orders_request_fingerprint_object
    check (jsonb_typeof(request_fingerprint) = 'object'),
  add constraint orders_confirmation_token_unique unique (confirmation_token);

create function public.is_valid_checkout_address(p_address jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    p_address is not null
    and jsonb_typeof(p_address) = 'object'
    and btrim(coalesce(p_address->>'recipientName', '')) <> ''
    and length(btrim(coalesce(p_address->>'recipientName', ''))) <= 150
    and btrim(coalesce(p_address->>'phone', '')) <> ''
    and length(btrim(coalesce(p_address->>'phone', ''))) <= 30
    and btrim(coalesce(p_address->>'addressLine1', '')) <> ''
    and length(btrim(coalesce(p_address->>'addressLine1', ''))) <= 200
    and length(btrim(coalesce(p_address->>'addressLine2', ''))) <= 200
    and btrim(coalesce(p_address->>'city', '')) <> ''
    and length(btrim(coalesce(p_address->>'city', ''))) <= 100
    and btrim(coalesce(p_address->>'county', '')) <> ''
    and length(btrim(coalesce(p_address->>'county', ''))) <= 100
    and length(btrim(coalesce(p_address->>'postalCode', ''))) <= 20
    and upper(btrim(coalesce(p_address->>'countryCode', ''))) = 'RO';
$$;

revoke all on function public.is_valid_checkout_address(jsonb)
from public, anon, authenticated;

create or replace function public.place_cod_order(
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
  v_initial_quote jsonb;
  v_quote jsonb;
  v_quote_line jsonb;
  v_order public.orders%rowtype;
  v_inventory public.inventory%rowtype;
  v_quantity integer;
  v_quantity_before integer;
  v_variant_id uuid;
begin
  if p_idempotency_key is null then
    return jsonb_build_object(
      'success', false,
      'code', 'invalid_idempotency_key',
      'message', 'Reîncarcă pagina de checkout și încearcă din nou.'
    );
  end if;

  -- One transaction per idempotency key. A retry waits for the first request,
  -- then reads the completed order instead of racing the unique constraint.
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

  if p_checkout->>'paymentMethod' <> 'cash_on_delivery' then
    return jsonb_build_object(
      'success', false,
      'code', 'payment_method_unavailable',
      'message', 'În această etapă este disponibilă numai plata ramburs.'
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

  -- JSONB canonicalizes key order. The fingerprint intentionally contains
  -- only normalized checkout values, the caller identity and cart selectors.
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
    'paymentMethod', 'cash_on_delivery',
    'lines', p_lines
  );

  select o.* into v_existing
  from public.orders o
  where o.idempotency_key = p_idempotency_key;

  if found then
    if v_existing.request_fingerprint <> v_fingerprint then
      return jsonb_build_object(
        'success', false,
        'code', 'idempotency_conflict',
        'message', 'Această încercare de comandă a fost deja folosită cu alte date.'
      );
    end if;
    return jsonb_build_object(
      'success', true,
      'idempotentReplay', true,
      'orderId', v_existing.id,
      'publicNumber', v_existing.public_number,
      'confirmationToken', v_existing.confirmation_token,
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

  -- Product locks also serialize creation of a previously absent inventory
  -- row because inventory target validation locks the same parent product.
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

  -- Re-run every catalog, configuration, price and stock rule after all
  -- relevant rows are locked. No trusted gap remains before mutation.
  v_quote := public.quote_checkout(p_lines);
  if not coalesce((v_quote->>'valid')::boolean, false) then
    return jsonb_build_object(
      'success', false,
      'code', 'cart_invalid',
      'message', 'Coșul s-a schimbat. Verifică produsele înainte de a continua.',
      'quote', v_quote
    );
  end if;

  -- quote_checkout validates each line independently. Placement additionally
  -- validates aggregate demand when multiple configurations share one stock
  -- target, preventing two individually-valid lines from overselling it.
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
    if v_inventory.quantity < v_quantity then
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
    idempotency_key,
    request_fingerprint,
    user_id,
    email,
    phone,
    customer_type,
    company_name,
    company_tax_id,
    company_registration_number,
    shipping_address,
    billing_same_as_shipping,
    billing_address,
    shipping_method_id,
    shipping_method_code,
    shipping_method_name,
    payment_method,
    payment_status,
    status,
    subtotal_minor,
    shipping_minor,
    total_minor,
    currency
  ) values (
    p_idempotency_key,
    v_fingerprint,
    v_user_id,
    v_email,
    v_phone,
    v_customer_type,
    v_company_name,
    v_company_tax_id,
    v_company_registration_number,
    v_shipping_address,
    v_billing_same,
    v_billing_address,
    v_shipping.id,
    v_shipping.code,
    v_shipping.name,
    'cash_on_delivery',
    'unpaid',
    'new',
    (v_quote->>'subtotalMinor')::bigint,
    v_shipping.price_minor,
    (v_quote->>'subtotalMinor')::bigint + v_shipping.price_minor,
    'RON'
  ) returning * into v_order;

  insert into public.order_status_history (
    order_id,
    from_status,
    to_status,
    actor_user_id,
    note
  ) values (
    v_order.id,
    null,
    'new',
    v_user_id,
    'Comandă ramburs înregistrată.'
  );

  for v_quote_line in
    select value from jsonb_array_elements(v_quote->'lines')
  loop
    v_variant_id := case
      when nullif(v_quote_line->'variant', 'null'::jsonb) is null then null
      else (v_quote_line#>>'{variant,id}')::uuid
    end;
    v_quantity := (v_quote_line->>'quantity')::integer;

    insert into public.order_items (
      order_id,
      product_id,
      variant_id,
      product_name,
      product_slug,
      variant_snapshot,
      customizations_snapshot,
      unit_base_price_minor,
      customization_total_minor,
      unit_price_minor,
      quantity,
      line_subtotal_minor
    ) values (
      v_order.id,
      (v_quote_line->>'productId')::uuid,
      v_variant_id,
      v_quote_line->>'name',
      v_quote_line->>'slug',
      nullif(v_quote_line->'variant', 'null'::jsonb),
      v_quote_line->'customizations',
      (v_quote_line->>'basePriceMinor')::bigint,
      (v_quote_line->>'customizationTotalMinor')::bigint,
      (v_quote_line->>'unitPriceMinor')::bigint,
      v_quantity,
      (v_quote_line->>'lineSubtotalMinor')::bigint
    );

    select i.* into v_inventory
    from public.inventory i
    where (v_variant_id is not null and i.variant_id = v_variant_id)
      or (v_variant_id is null and i.product_id = (v_quote_line->>'productId')::uuid);

    if found then
      v_quantity_before := v_inventory.quantity;
      update public.inventory
      set quantity = quantity - v_quantity
      where id = v_inventory.id
      returning * into v_inventory;

      insert into public.inventory_movements (
        inventory_id,
        quantity_delta,
        quantity_before,
        quantity_after,
        reason,
        actor_user_id,
        context
      ) values (
        v_inventory.id,
        -v_quantity,
        v_quantity_before,
        v_inventory.quantity,
        'Plasare comandă ramburs',
        v_user_id,
        jsonb_build_object(
          'orderId', v_order.id,
          'publicNumber', v_order.public_number,
          'source', 'place_cod_order'
        )
      );

      if v_inventory.quantity = 0
        and v_quote_line->>'productType' = 'unique'
      then
        update public.products
        set availability_status = 'unavailable'
        where id = (v_quote_line->>'productId')::uuid;
      end if;
    end if;
  end loop;

  return jsonb_build_object(
    'success', true,
    'idempotentReplay', false,
    'orderId', v_order.id,
    'publicNumber', v_order.public_number,
    'confirmationToken', v_order.confirmation_token,
    'subtotalMinor', v_order.subtotal_minor,
    'shippingMinor', v_order.shipping_minor,
    'totalMinor', v_order.total_minor,
    'currency', v_order.currency
  );
end;
$$;

revoke all on function public.place_cod_order(uuid, jsonb, jsonb)
from public;
grant execute on function public.place_cod_order(uuid, jsonb, jsonb)
to anon, authenticated;

create function public.get_order_confirmation(p_confirmation_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'found', true,
        'publicNumber', o.public_number,
        'totalMinor', o.total_minor,
        'currency', o.currency,
        'paymentMethod', o.payment_method,
        'shippingMethodName', o.shipping_method_name,
        'createdAt', o.created_at
      )
      from public.orders o
      where o.confirmation_token = p_confirmation_token
    ),
    jsonb_build_object('found', false)
  );
$$;

revoke all on function public.get_order_confirmation(uuid) from public;
grant execute on function public.get_order_confirmation(uuid)
to anon, authenticated;

commit;
