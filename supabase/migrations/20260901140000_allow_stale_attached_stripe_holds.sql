begin;

create or replace function public.protect_stock_reservation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_physical_quantity integer;
  v_other_reserved bigint;
  v_has_attached_stripe_session boolean;
begin
  if new.status <> 'active'::public.stock_reservation_status then
    return new;
  end if;

  select p.provider = 'stripe' and p.provider_checkout_session_id is not null
  into v_has_attached_stripe_session
  from public.payments p
  where p.id = new.payment_id;

  if new.expires_at <= statement_timestamp()
    and not coalesce(v_has_attached_stripe_session, false)
  then
    raise exception 'An active reservation without a Stripe Session must expire in the future.'
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
  join public.payments p on p.id = sr.payment_id
  where sr.inventory_id = new.inventory_id
    and sr.id is distinct from new.id
    and sr.status = 'active'::public.stock_reservation_status
    and (
      sr.expires_at > statement_timestamp()
      or (p.provider = 'stripe' and p.provider_checkout_session_id is not null)
    );

  if v_other_reserved + new.quantity::bigint > v_physical_quantity::bigint then
    raise exception 'Reservation exceeds effective available inventory.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

commit;
