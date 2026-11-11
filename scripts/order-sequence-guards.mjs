// Technical metadata only: no customer/order rows or sequence-consuming calls.
export const snapshotQuery = "select jsonb_build_object(\n'read_only',current_setting('transaction_read_only'),\n'current_role',current_user,\n'migrations',(select jsonb_agg(jsonb_build_object('version',version,'name',name,'statements_md5',md5(statements::text)) order by version) from supabase_migrations.schema_migrations),\n'sequence',(select jsonb_build_object('owner',pg_get_userbyid(c.relowner),'kind',c.relkind,'acl',c.relacl,'definition',jsonb_build_object('cycle',s.cycle,'data_type',s.data_type::text,'max_value',s.max_value::text,'min_value',s.min_value::text,'cache_size',s.cache_size::text,'start_value',s.start_value::text,'increment_by',s.increment_by::text),'acl_entries',(select jsonb_agg(jsonb_build_object('grantee',case when a.grantee=0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,'grantor',pg_get_userbyid(a.grantor),'is_grantable',a.is_grantable,'privilege_type',a.privilege_type) order by pg_get_userbyid(a.grantor),pg_get_userbyid(a.grantee),a.privilege_type) from aclexplode(coalesce(c.relacl,acldefault('s',c.relowner))) a)) from pg_class c join pg_sequences s on s.schemaname='public' and s.sequencename='order_public_number_seq' where c.oid='public.order_public_number_seq'::regclass),\n'sequence_state',(select jsonb_build_object('last_value',last_value,'log_cnt',log_cnt,'is_called',is_called) from public.order_public_number_seq),\n'roles',(select jsonb_agg(jsonb_build_object('name',r.rolname,'super',r.rolsuper,'inherit',r.rolinherit,'bypass',r.rolbypassrls,'usage',has_sequence_privilege(r.oid,'public.order_public_number_seq','USAGE'),'select',has_sequence_privilege(r.oid,'public.order_public_number_seq','SELECT'),'update',has_sequence_privilege(r.oid,'public.order_public_number_seq','UPDATE')) order by r.rolname) from pg_roles r where r.rolname in('postgres','anon','authenticated','service_role')),\n'memberships',(select jsonb_agg(jsonb_build_object('member',pg_get_userbyid(member),'role',pg_get_userbyid(roleid),'inherit_option',inherit_option,'set_option',set_option) order by member,roleid) from pg_auth_members),\n'functions',(select jsonb_agg(jsonb_build_object('name',proname,'args',pg_get_function_identity_arguments(oid),'owner',pg_get_userbyid(proowner),'definer',prosecdef,'config',proconfig,'acl',proacl,'source_md5',md5(prosrc),'definition_md5',md5(pg_get_functiondef(oid)),'definition',case when proname='next_order_public_number' then pg_get_functiondef(oid) else null end) order by proname) from pg_proc where pronamespace='public'::regnamespace and proname in('next_order_public_number','place_cod_order','prepare_card_order','prepare_card_order_server')),\n'defaults',(select jsonb_agg(jsonb_build_object('object',pg_describe_object('pg_attrdef'::regclass,oid,0),'expression',pg_get_expr(adbin,adrelid))) from pg_attrdef where pg_get_expr(adbin,adrelid) ilike '%next_order_public_number%' or pg_get_expr(adbin,adrelid) ilike '%order_public_number_seq%'),\n'triggers',(select jsonb_agg(jsonb_build_object('name',t.tgname,'function',p.proname,'definition',pg_get_triggerdef(t.oid)) order by t.tgname) from pg_trigger t join pg_proc p on p.oid=t.tgfoid where not t.tgisinternal and t.tgrelid='public.orders'::regclass)\n) as audit";

const literal = (value) => "'" + value.replaceAll("'", "''") + "'";

export function buildSnapshotGuards(snapshot, migration) {
  if (snapshot.migrations?.length !== 28 || snapshot.sequence?.owner !== "postgres") {
    throw new Error("Expected audited 28-migration Development snapshot");
  }
  const before = structuredClone(snapshot);
  delete before.read_only;
  delete before.current_role;
  const hardenedAcl = before.sequence.acl_entries.filter((entry) =>
    !["PUBLIC", "anon", "authenticated"].includes(entry.grantee));
  const expectedRoles = before.roles.map((role) =>
    ["anon", "authenticated"].includes(role.name)
      ? { ...role, usage: false, select: false, update: false } : role);
  const preflight = `do $final_preflight$
declare v jsonb;
begin
 if current_user <> 'postgres' then raise exception 'Expected postgres application role'; end if;
 select audit - array['read_only','current_role']::text[] into v from (${snapshotQuery}) s;
 if v is distinct from ${literal(JSON.stringify(before))}::jsonb then
   raise exception 'Relevant metadata or sequence state changed since saved snapshot; STOP';
 end if;
end;
$final_preflight$;`;
  const postflight = `do $final_postflight$
declare v jsonb;
begin
 select audit - array['read_only','current_role']::text[] into v from (${snapshotQuery}) s;
 if (v - array['migrations','sequence','roles']::text[]) is distinct from
   (${literal(JSON.stringify(before))}::jsonb - array['migrations','sequence','roles']::text[]) then
   raise exception 'Unexpected function, dependency, membership or sequence state change';
 end if;
 -- Parenthesize JSON extraction BEFORE subtraction: regression for SQLSTATE 22P02.
 if ((v->'sequence') - array['acl','acl_entries']::text[]) is distinct from
   (${literal(JSON.stringify(before.sequence))}::jsonb - array['acl','acl_entries']::text[]) then
   raise exception 'Sequence definition or owner changed';
 end if;
 if v->'sequence'->'acl_entries' is distinct from ${literal(JSON.stringify(hardenedAcl))}::jsonb then
   raise exception 'Unexpected sequence ACL after remediation';
 end if;
 if v->'roles' is distinct from ${literal(JSON.stringify(expectedRoles))}::jsonb then
   raise exception 'Effective sequence privileges differ from expected roles';
 end if;
 if jsonb_array_length(v->'migrations') <> 29
   or ((v->'migrations') - 28) is distinct from ${literal(JSON.stringify(before.migrations))}::jsonb then
   raise exception 'Previous migration records changed';
 end if;
 if not exists(select 1 from supabase_migrations.schema_migrations
   where version='20261110120000' and name='harden_order_public_number_sequence'
     and statements=array[${literal(migration)}]::text[]) then
   raise exception 'New migration record differs from reviewed SQL';
 end if;
end;
$final_postflight$;`;
  return { preflight, postflight };
}
