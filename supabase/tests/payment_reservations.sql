begin;

create function public.test_force_reservation_rollback()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.inventory i
    where i.id = new.inventory_id
      and i.product_id = '58000000-0000-4000-8000-000000000004'::uuid
  ) then
    raise exception 'forced reservation failure' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger payment_reservation_force_rollback
before insert on public.stock_reservations
for each row execute function public.test_force_reservation_rollback();

do $$
declare
  v_standard_id uuid := '58000000-0000-4000-8000-000000000001';
  v_unique_id uuid := '58000000-0000-4000-8000-000000000002';
  v_expiring_id uuid := '58000000-0000-4000-8000-000000000003';
  v_rollback_id uuid := '58000000-0000-4000-8000-000000000004';
  v_shipping_id uuid := '58000000-0000-4000-8000-000000000005';
  v_standard_key uuid := '58000000-0000-4000-8000-000000000010';
  v_unique_key uuid := '58000000-0000-4000-8000-000000000011';
  v_expiring_key uuid := '58000000-0000-4000-8000-000000000012';
  v_rollback_key uuid := '58000000-0000-4000-8000-000000000013';
  v_checkout jsonb;
  v_cod_checkout jsonb;
  v_result jsonb;
  v_retry jsonb;
  v_standard_order_id uuid;
  v_standard_payment_id uuid;
  v_unique_order_id uuid;
  v_unique_payment_id uuid;
  v_expiring_order_id uuid;
  v_expiring_payment_id uuid;
  v_inventory_id uuid;
  v_count integer;
begin
  assert to_regclass('public.payments') is not null,
    'payments table is missing';
  assert to_regclass('public.stock_reservations') is not null,
    'stock_reservations table is missing';
  assert to_regprocedure('public.prepare_card_order(uuid,jsonb,jsonb)') is not null,
    'prepare_card_order is missing';
  assert to_regprocedure('public.confirm_card_payment(uuid,text,text)') is not null,
    'confirm_card_payment is missing';
  assert to_regprocedure('public.release_card_order_reservations(uuid,text)') is not null,
    'release_card_order_reservations is missing';
  assert to_regprocedure('public.expire_stock_reservations(timestamptz)') is not null,
    'expire_stock_reservations is missing';
  assert public.stock_reservation_ttl() = interval '30 minutes',
    'reservation TTL is not centralized at 30 minutes';

  assert (select relrowsecurity from pg_class
    where oid = 'public.payments'::regclass),
    'payments RLS must be enabled';
  assert (select relrowsecurity from pg_class
    where oid = 'public.stock_reservations'::regclass),
    'stock_reservations RLS must be enabled';
  assert not has_table_privilege('anon', 'public.payments', 'insert'),
    'anonymous users must not insert payments directly';
  assert not has_table_privilege('authenticated', 'public.payments', 'update'),
    'customers must not update payments directly';
  assert not has_table_privilege('anon', 'public.stock_reservations', 'insert'),
    'anonymous users must not insert reservations directly';
  assert not has_table_privilege('authenticated', 'public.stock_reservations', 'update'),
    'customers must not update reservations directly';
  assert has_function_privilege(
    'anon', 'public.prepare_card_order(uuid,jsonb,jsonb)', 'execute'
  ), 'guest checkout cannot prepare a card order';
  assert has_function_privilege(
    'authenticated', 'public.prepare_card_order(uuid,jsonb,jsonb)', 'execute'
  ), 'customer checkout cannot prepare a card order';
  assert not has_function_privilege(
    'anon', 'public.confirm_card_payment(uuid,text,text)', 'execute'
  ), 'guest can confirm a payment';
  assert not has_function_privilege(
    'authenticated', 'public.confirm_card_payment(uuid,text,text)', 'execute'
  ), 'customer can confirm a payment';
  assert not has_function_privilege(
    'anon', 'public.release_card_order_reservations(uuid,text)', 'execute'
  ), 'guest can release reservations';
  assert not has_function_privilege(
    'authenticated', 'public.expire_stock_reservations(timestamptz)', 'execute'
  ), 'customer can expire reservations';

  insert into public.products (
    id, name, slug, base_price, product_type, publication_status,
    availability_status, is_customizable
  ) values
    (v_standard_id, 'Produs rezervare SQL', 'produs-rezervare-sql', 20.00,
      'standard', 'published', 'in_stock', false),
    (v_unique_id, 'Unicat rezervare SQL', 'unicat-rezervare-sql', 50.00,
      'unique', 'published', 'unique', false),
    (v_expiring_id, 'Produs expirare SQL', 'produs-expirare-sql', 30.00,
      'standard', 'published', 'in_stock', false),
    (v_rollback_id, 'Produs rollback SQL', 'produs-rollback-sql', 40.00,
      'standard', 'published', 'in_stock', false);

  insert into public.inventory (product_id, quantity)
  values
    (v_standard_id, 3),
    (v_unique_id, 1),
    (v_expiring_id, 1),
    (v_rollback_id, 2);

  insert into public.shipping_methods (id, code, name, price_minor)
  values (v_shipping_id, 'card-foundation-sql', 'Curier Card SQL', 750);

  v_checkout := jsonb_build_object(
    'email', 'card-foundation@example.com',
    'phone', '0712345678',
    'customerType', 'individual',
    'companyName', '',
    'companyTaxId', '',
    'companyRegistrationNumber', '',
    'shippingAddress', jsonb_build_object(
      'recipientName', 'Card SQL', 'phone', '0712345678',
      'addressLine1', 'Strada Test 1', 'addressLine2', '',
      'city', 'București', 'county', 'București',
      'postalCode', '010101', 'countryCode', 'RO'
    ),
    'billingSameAsShipping', true,
    'billingAddress', '{}'::jsonb,
    'shippingMethodId', v_shipping_id,
    'paymentMethod', 'card',
    'subtotalMinor', 1,
    'shippingMinor', 1
  );
  v_cod_checkout := jsonb_set(
    v_checkout,
    '{paymentMethod}',
    '"cash_on_delivery"'::jsonb
  );

  -- Normal reservation, authoritative totals, and no premature stock sale.
  v_result := public.prepare_card_order(
    v_standard_key,
    jsonb_build_array(jsonb_build_object(
      'key', 'standard-card',
      'productId', v_standard_id,
      'quantity', 2,
      'unitPriceMinor', 1,
      'customizations', '[]'::jsonb
    )),
    v_checkout
  );
  assert (v_result->>'success')::boolean,
    'normal card preparation failed: ' || v_result::text;
  assert not (v_result->>'idempotentReplay')::boolean,
    'first card preparation was marked as replay';
  assert (v_result->>'subtotalMinor')::bigint = 4000
    and (v_result->>'shippingMinor')::bigint = 750
    and (v_result->>'totalMinor')::bigint = 4750,
    'card preparation trusted browser totals';
  v_standard_order_id := (v_result->>'orderId')::uuid;
  v_standard_payment_id := (v_result->>'paymentId')::uuid;

  assert (select payment_method = 'card'
      and payment_status = 'pending'
      and status = 'awaiting_payment'
    from public.orders where id = v_standard_order_id),
    'card order initial state is incorrect';
  assert (select provider = 'internal' and status = 'pending'
      and amount_minor = 4750 and currency = 'RON'
    from public.payments where id = v_standard_payment_id),
    'pending payment foundation is incorrect';
  assert (select count(*) = 1 and sum(quantity) = 2
    from public.stock_reservations
    where order_id = v_standard_order_id and status = 'active'),
    'available inventory was not reserved';
  assert (select quantity = 3 from public.inventory
    where product_id = v_standard_id),
    'reservation incorrectly changed physical inventory';
  assert not exists (
    select 1 from public.inventory_movements
    where context->>'orderId' = v_standard_order_id::text
  ), 'reservation incorrectly created a sale movement';

  -- Retry must return the same graph without duplicating any row or quantity.
  v_retry := public.prepare_card_order(
    v_standard_key,
    jsonb_build_array(jsonb_build_object(
      'key', 'standard-card', 'productId', v_standard_id,
      'quantity', 2, 'unitPriceMinor', 1,
      'customizations', '[]'::jsonb
    )),
    v_checkout
  );
  assert (v_retry->>'success')::boolean
    and (v_retry->>'idempotentReplay')::boolean
    and (v_retry->>'orderId')::uuid = v_standard_order_id
    and (v_retry->>'paymentId')::uuid = v_standard_payment_id,
    'idempotent card retry did not return the original graph';
  assert (select count(*) = 1 from public.orders
    where idempotency_key = v_standard_key),
    'card retry duplicated the order';
  assert (select count(*) = 1 from public.payments
    where idempotency_key = v_standard_key),
    'card retry duplicated the payment';
  assert (select count(*) = 1 from public.stock_reservations
    where request_idempotency_key = v_standard_key),
    'card retry duplicated the reservation';

  v_result := public.prepare_card_order(
    v_standard_key,
    jsonb_build_array(jsonb_build_object(
      'key', 'changed', 'productId', v_standard_id,
      'quantity', 1, 'customizations', '[]'::jsonb
    )),
    v_checkout
  );
  assert not (v_result->>'success')::boolean
    and v_result->>'code' = 'idempotency_conflict',
    'incompatible card idempotency reuse was accepted';

  -- Effective availability is 1 (physical 3 - reservation 2).
  v_result := public.prepare_card_order(
    '58000000-0000-4000-8000-000000000020',
    jsonb_build_array(jsonb_build_object(
      'key', 'over-stock', 'productId', v_standard_id,
      'quantity', 2, 'customizations', '[]'::jsonb
    )),
    v_checkout
  );
  assert not (v_result->>'success')::boolean,
    'reservation above effective stock was accepted';

  v_result := public.prepare_card_order(
    '58000000-0000-4000-8000-000000000026',
    jsonb_build_array(
      jsonb_build_object(
        'key', 'aggregate-a', 'productId', v_standard_id,
        'quantity', 1, 'customizations', '[]'::jsonb
      ),
      jsonb_build_object(
        'key', 'aggregate-b', 'productId', v_standard_id,
        'quantity', 1, 'customizations', '[]'::jsonb
      )
    ),
    v_checkout
  );
  assert not (v_result->>'success')::boolean,
    'aggregate lines reserved above effective stock';

  -- COD can buy the one unreserved unit, but not either reserved unit.
  v_result := public.place_cod_order(
    '58000000-0000-4000-8000-000000000021',
    jsonb_build_array(jsonb_build_object(
      'key', 'cod-available', 'productId', v_standard_id,
      'quantity', 1, 'customizations', '[]'::jsonb
    )),
    v_cod_checkout
  );
  assert (v_result->>'success')::boolean,
    'COD could not buy physically available, unreserved inventory';
  assert (select quantity = 2 from public.inventory
    where product_id = v_standard_id),
    'COD physical decrement is incorrect';

  v_result := public.place_cod_order(
    '58000000-0000-4000-8000-000000000022',
    jsonb_build_array(jsonb_build_object(
      'key', 'cod-reserved', 'productId', v_standard_id,
      'quantity', 1, 'customizations', '[]'::jsonb
    )),
    v_cod_checkout
  );
  assert not (v_result->>'success')::boolean,
    'COD ignored active card reservations';
  assert (select quantity = 2 from public.inventory
    where product_id = v_standard_id),
    'rejected COD changed physical inventory';

  -- The trigger is a final invariant for aggregate/direct inventory writers.
  select id into v_inventory_id from public.inventory
  where product_id = v_standard_id;
  begin
    update public.inventory set quantity = 1 where id = v_inventory_id;
    assert false, 'inventory was reduced below active reservations';
  exception when check_violation then
    null;
  end;
  assert (select quantity = 2 from public.inventory where id = v_inventory_id),
    'failed reserved-inventory update was not rolled back';

  -- Consume once: physical stock and movement change exactly once.
  v_result := public.confirm_card_payment(
    v_standard_payment_id,
    'internal-confirm-standard',
    'internal'
  );
  assert (v_result->>'success')::boolean
    and not (v_result->>'idempotentReplay')::boolean,
    'active reservation could not be consumed';
  assert (select quantity = 0 from public.inventory
    where product_id = v_standard_id),
    'consume did not decrement physical inventory exactly once';
  assert (select status = 'consumed' and consumed_at is not null
    from public.stock_reservations where order_id = v_standard_order_id),
    'reservation was not marked consumed';
  assert (select status = 'paid' and paid_at is not null
    from public.payments where id = v_standard_payment_id),
    'payment was not marked paid';
  assert (select payment_status = 'paid' and status = 'paid'
    from public.orders where id = v_standard_order_id),
    'order was not marked paid';
  assert (select count(*) = 1 from public.inventory_movements
    where context->>'paymentId' = v_standard_payment_id::text
      and quantity_delta = -2),
    'consume did not create exactly one movement';

  v_retry := public.confirm_card_payment(
    v_standard_payment_id,
    'internal-confirm-standard',
    'internal'
  );
  assert (v_retry->>'success')::boolean
    and (v_retry->>'idempotentReplay')::boolean,
    'repeated consume was not idempotent';
  assert (select quantity = 0 from public.inventory
    where product_id = v_standard_id),
    'repeated consume decremented stock twice';
  assert (select count(*) = 1 from public.inventory_movements
    where context->>'paymentId' = v_standard_payment_id::text),
    'repeated consume duplicated the movement';

  -- Unique inventory can belong to only one active checkout and blocks COD.
  v_result := public.prepare_card_order(
    v_unique_key,
    jsonb_build_array(jsonb_build_object(
      'key', 'unique-card', 'productId', v_unique_id,
      'quantity', 1, 'customizations', '[]'::jsonb
    )),
    v_checkout
  );
  assert (v_result->>'success')::boolean,
    'unique product could not be reserved';
  v_unique_order_id := (v_result->>'orderId')::uuid;
  v_unique_payment_id := (v_result->>'paymentId')::uuid;

  v_result := public.prepare_card_order(
    '58000000-0000-4000-8000-000000000023',
    jsonb_build_array(jsonb_build_object(
      'key', 'unique-second-card', 'productId', v_unique_id,
      'quantity', 1, 'customizations', '[]'::jsonb
    )),
    v_checkout
  );
  assert not (v_result->>'success')::boolean,
    'unique product was reserved twice';

  v_result := public.place_cod_order(
    '58000000-0000-4000-8000-000000000024',
    jsonb_build_array(jsonb_build_object(
      'key', 'unique-cod', 'productId', v_unique_id,
      'quantity', 1, 'customizations', '[]'::jsonb
    )),
    v_cod_checkout
  );
  assert not (v_result->>'success')::boolean,
    'COD bought an actively reserved unique product';

  -- Release is idempotent and released inventory cannot later be consumed.
  v_result := public.release_card_order_reservations(
    v_unique_order_id,
    'internal-release-unique'
  );
  assert (v_result->>'success')::boolean
    and not (v_result->>'idempotentReplay')::boolean,
    'active unique reservation could not be released';
  assert (select status = 'released' and released_at is not null
    from public.stock_reservations where order_id = v_unique_order_id),
    'unique reservation was not marked released';

  v_retry := public.release_card_order_reservations(
    v_unique_order_id,
    'internal-release-unique'
  );
  assert (v_retry->>'success')::boolean
    and (v_retry->>'idempotentReplay')::boolean,
    'repeated release was not idempotent';
  v_result := public.confirm_card_payment(
    v_unique_payment_id,
    'internal-confirm-released',
    'internal'
  );
  assert not (v_result->>'success')::boolean,
    'released reservation was consumed';
  assert (select quantity = 1 from public.inventory
    where product_id = v_unique_id),
    'release changed physical unique inventory';

  -- Once released, the unique product can be reserved again and sold once.
  v_result := public.prepare_card_order(
    '58000000-0000-4000-8000-000000000025',
    jsonb_build_array(jsonb_build_object(
      'key', 'unique-after-release', 'productId', v_unique_id,
      'quantity', 1, 'customizations', '[]'::jsonb
    )),
    v_checkout
  );
  assert (v_result->>'success')::boolean,
    'released unique inventory did not become available';
  v_result := public.confirm_card_payment(
    (v_result->>'paymentId')::uuid,
    'internal-confirm-unique',
    'internal'
  );
  assert (v_result->>'success')::boolean,
    'unique reservation could not be consumed';
  assert (select quantity = 0 from public.inventory
    where product_id = v_unique_id),
    'unique consume did not reach zero stock';
  assert (select availability_status = 'unavailable'
    from public.products where id = v_unique_id),
    'consumed unique product was not marked unavailable';

  -- Expired holds stop blocking stock, sweep once, and cannot be consumed.
  v_result := public.prepare_card_order(
    v_expiring_key,
    jsonb_build_array(jsonb_build_object(
      'key', 'expiring-card', 'productId', v_expiring_id,
      'quantity', 1, 'customizations', '[]'::jsonb
    )),
    v_checkout
  );
  assert (v_result->>'success')::boolean,
    'expiring reservation setup failed';
  v_expiring_order_id := (v_result->>'orderId')::uuid;
  v_expiring_payment_id := (v_result->>'paymentId')::uuid;

  v_result := public.expire_stock_reservations(
    statement_timestamp() + interval '31 minutes'
  );
  assert (v_result->>'success')::boolean
    and (v_result->>'expiredReservations')::integer = 1
    and (v_result->>'expiredOrders')::integer = 1,
    'expiration sweep did not transition the due graph';
  assert (select status = 'expired' and expired_at is not null
    from public.stock_reservations where order_id = v_expiring_order_id),
    'reservation was not marked expired';
  assert (select status = 'expired' from public.payments
    where id = v_expiring_payment_id),
    'payment was not marked expired';
  assert (select status = 'cancelled' from public.orders
    where id = v_expiring_order_id),
    'expired card order was not cancelled';

  assert (public.quote_checkout(jsonb_build_array(jsonb_build_object(
    'key', 'after-expiry', 'productId', v_expiring_id,
    'quantity', 1, 'customizations', '[]'::jsonb
  )))->>'valid')::boolean,
    'expired reservation still blocked effective stock';

  v_result := public.confirm_card_payment(
    v_expiring_payment_id,
    'internal-confirm-expired',
    'internal'
  );
  assert not (v_result->>'success')::boolean,
    'expired reservation was consumed';

  v_retry := public.expire_stock_reservations(
    statement_timestamp() + interval '31 minutes'
  );
  assert (v_retry->>'expiredReservations')::integer = 0
    and (v_retry->>'expiredOrders')::integer = 0,
    'expiration sweep was not idempotent';
  assert (select quantity = 1 from public.inventory
    where product_id = v_expiring_id),
    'expiration changed physical inventory';

  -- A forced failure after order/payment/item insertion must roll back all.
  begin
    perform public.prepare_card_order(
      v_rollback_key,
      jsonb_build_array(jsonb_build_object(
        'key', 'rollback-card', 'productId', v_rollback_id,
        'quantity', 1, 'customizations', '[]'::jsonb
      )),
      v_checkout
    );
    assert false, 'forced middle failure did not abort card preparation';
  exception when check_violation then
    null;
  end;

  assert not exists (select 1 from public.orders
    where idempotency_key = v_rollback_key),
    'middle failure left a partial order';
  assert not exists (select 1 from public.payments
    where idempotency_key = v_rollback_key),
    'middle failure left a partial payment';
  assert not exists (select 1 from public.stock_reservations
    where request_idempotency_key = v_rollback_key),
    'middle failure left a partial reservation';
  assert (select quantity = 2 from public.inventory
    where product_id = v_rollback_id),
    'middle failure changed inventory';

  select count(*) into v_count from public.inventory where quantity < 0;
  assert v_count = 0, 'inventory became negative';
end;
$$;

rollback;

-- Concurrency verification requires two database sessions. Both card
-- preparations lock the same inventory row before their final quote and
-- aggregate check; the loser resumes only after the winner commits and sees
-- the newly active reservation. The inventory trigger provides the same final
-- guard for card-vs-COD and other inventory writers.
