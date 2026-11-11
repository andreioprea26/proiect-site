-- Atomic statement; an external migration runner may wrap it in a transaction.
-- No sequence values, function definitions, ownership, or other ACLs are changed.
do $order_sequence_hardening$
declare
  v_role text;
  v_preserved_acl jsonb;
  v_current_acl jsonb;
begin
  if not exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_proc p on p.oid = to_regprocedure('public.next_order_public_number()')
    where c.oid = to_regclass('public.order_public_number_seq')
      and c.relkind = 'S' and c.relowner = p.proowner
      and pg_catalog.pg_get_userbyid(c.relowner) = 'postgres'
      and p.prosecdef
      and p.proconfig in (array['search_path=']::text[], array['search_path=""']::text[])
  ) then
    raise exception 'order-number sequence/generator ownership or security configuration differs from audit';
  end if;
  if not has_function_privilege('service_role', 'public.next_order_public_number()', 'EXECUTE') then
    raise exception 'trusted order-number generator is unavailable to service_role';
  end if;

  -- Preserve every other explicit ACL entry, including privileged roles and
  -- grant options. RESTRICT must fail rather than cascade downstream grants.
  select coalesce(jsonb_agg(to_jsonb(a) order by a.grantor, a.grantee, a.privilege_type), '[]'::jsonb)
  into v_preserved_acl
  from pg_catalog.pg_class c,
    lateral pg_catalog.aclexplode(coalesce(c.relacl, pg_catalog.acldefault('s', c.relowner))) a
  where c.oid = 'public.order_public_number_seq'::regclass
    and a.grantee not in (0, 'anon'::regrole, 'authenticated'::regrole);

  revoke usage, select, update on sequence public.order_public_number_seq
    from public, anon, authenticated restrict;

  foreach v_role in array array['anon', 'authenticated'] loop
    if has_sequence_privilege(v_role, 'public.order_public_number_seq', 'USAGE,SELECT,UPDATE') then
      raise exception 'order-number sequence privileges remain effective for % (check inherited grants)', v_role;
    end if;
  end loop;

  select coalesce(jsonb_agg(to_jsonb(a) order by a.grantor, a.grantee, a.privilege_type), '[]'::jsonb)
  into v_current_acl
  from pg_catalog.pg_class c,
    lateral pg_catalog.aclexplode(coalesce(c.relacl, pg_catalog.acldefault('s', c.relowner))) a
  where c.oid = 'public.order_public_number_seq'::regclass
    and a.grantee not in (0, 'anon'::regrole, 'authenticated'::regrole);
  if v_current_acl is distinct from v_preserved_acl then
    raise exception 'order-number sequence ACL changed for a non-target role';
  end if;
end;
$order_sequence_hardening$;
