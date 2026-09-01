begin;

create function public.process_stripe_checkout_event_hardened(
  p_event_id text,
  p_event_type text,
  p_session_id text,
  p_payment_intent_id text,
  p_payment_id uuid,
  p_order_id uuid,
  p_amount_total bigint,
  p_currency text,
  p_payment_status text,
  p_mode text,
  p_session_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_result jsonb;
begin
  if p_event_id is null or p_event_id !~ '^evt_[A-Za-z0-9_]+$'
    or length(p_event_id) > 255
  then
    return jsonb_build_object('success', false, 'code', 'invalid_event',
      'retryable', false);
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_event_id, 2));
  select jsonb_build_object(
    'success', true, 'idempotentReplay', true,
    'classification', swe.classification, 'eventId', swe.event_id,
    'result', swe.result
  ) into v_result
  from public.stripe_webhook_events swe
  where swe.event_id = p_event_id;
  if found then return v_result; end if;

  if p_payment_id is not null and p_order_id is not null then
    select p.* into v_payment
    from public.payments p
    where p.id = p_payment_id and p.order_id = p_order_id
      and p.provider in ('internal', 'stripe')
    for update;

    if found and v_payment.provider_checkout_session_id is not null
      and v_payment.provider_checkout_session_id <> p_session_id
    then
      v_result := jsonb_build_object(
        'action', 'rejected_permanent',
        'code', 'checkout_session_conflict'
      );
      insert into public.stripe_webhook_events (
        event_id, event_type, provider_checkout_session_id,
        payment_id, order_id, classification, reason, result
      ) values (
        p_event_id, p_event_type, p_session_id,
        v_payment.id, v_payment.order_id,
        'rejected_permanent', 'checkout_session_conflict', v_result
      );
      return jsonb_build_object(
        'success', true, 'idempotentReplay', false,
        'classification', 'rejected_permanent',
        'eventId', p_event_id, 'result', v_result
      );
    end if;
  end if;

  return public.process_stripe_checkout_event(
    p_event_id, p_event_type, p_session_id, p_payment_intent_id,
    p_payment_id, p_order_id, p_amount_total, p_currency,
    p_payment_status, p_mode, p_session_expires_at
  );
end;
$$;

revoke all on function public.process_stripe_checkout_event(
  text, text, text, text, uuid, uuid, bigint, text, text, text, timestamptz
) from service_role;

revoke all on function public.process_stripe_checkout_event_hardened(
  text, text, text, text, uuid, uuid, bigint, text, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.process_stripe_checkout_event_hardened(
  text, text, text, text, uuid, uuid, bigint, text, text, text, timestamptz
) to service_role;

commit;
