-- Fix: admin user listing fails with 42501 after admin_users_view uses security_invoker.
-- Use a SECURITY DEFINER RPC that safely reads auth.users and only returns rows to admins.

create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  display_name text,
  role text,
  status text,
  role_id uuid,
  role_name text,
  role_color text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    au.id as user_id,
    au.email,
    au.created_at,
    au.last_sign_in_at,
    coalesce(ur.display_name, split_part(au.email::text, '@'::text, 1)) as display_name,
    coalesce(ur.role, 'user'::text) as role,
    coalesce(ur.status, 'active'::text) as status,
    ur.role_id,
    r.name as role_name,
    r.color as role_color
  from auth.users au
  left join public.user_roles ur on ur.user_id = au.id
  left join public.roles r on r.id = ur.role_id
  where public.is_admin(auth.uid());
$$;

revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;
