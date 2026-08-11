begin;

-- The trigger must bypass table RLS while keeping caller-controlled schemas out
-- of name resolution. All referenced objects are therefore fully qualified.
create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id);

  -- Every new account starts with the least-privileged application role.
  insert into public.user_roles (user_id, role)
  values (new.id, 'customer'::public.app_role);

  return new;
end;
$$;

-- Only the Auth trigger may invoke this privileged function.
revoke all on function public.handle_new_auth_user() from public;
revoke all on function public.handle_new_auth_user() from anon;
revoke all on function public.handle_new_auth_user() from authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

commit;
