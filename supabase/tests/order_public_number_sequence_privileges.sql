-- Metadata only: never call nextval/setval or the order-number RPC here.
-- Expected to FAIL on the audited Development grants until remediation is approved.
begin read only;

do $$
declare
  v_role text;
begin
  assert to_regclass('public.order_public_number_seq') is not null,
    'order number sequence is missing';
  assert (
    select c.relkind = 'S' and c.relowner = p.proowner and p.prosecdef
      and pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
      and p.proconfig in (array['search_path=']::text[], array['search_path=""']::text[])
    from pg_catalog.pg_class c
    join pg_catalog.pg_proc p on p.oid = 'public.next_order_public_number()'::regprocedure
    where c.oid = 'public.order_public_number_seq'::regclass
  ), 'order-number generator must use its trusted sequence owner';

  foreach v_role in array array['anon', 'authenticated'] loop
    assert not has_sequence_privilege(v_role, 'public.order_public_number_seq', 'USAGE,SELECT,UPDATE'),
      format('%s has unnecessary direct order-number sequence privileges', v_role);
    assert not has_function_privilege(v_role, 'public.next_order_public_number()', 'EXECUTE'),
      format('%s can directly execute the order-number generator', v_role);
  end loop;

  assert not exists (
    select 1
    from pg_catalog.pg_class c,
      lateral pg_catalog.aclexplode(coalesce(c.relacl, pg_catalog.acldefault('s', c.relowner))) a
    where c.oid = 'public.order_public_number_seq'::regclass
      and a.grantee = 0
  ), 'PUBLIC has direct order-number sequence privileges';
  assert has_function_privilege('service_role', 'public.next_order_public_number()', 'EXECUTE'),
    'service role cannot use the trusted order-number generator';
end;
$$;

rollback;
