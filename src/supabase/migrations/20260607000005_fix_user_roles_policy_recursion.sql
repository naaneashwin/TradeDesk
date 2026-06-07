-- Fix: infinite recursion in RLS policies on public.user_roles (42P17)
-- Cause: policies queried public.user_roles inside policies for public.user_roles.
-- Solution: use a SECURITY DEFINER helper to check admin status without RLS recursion.

create or replace function public.is_admin(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = check_user_id
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

-- Recreate user_roles policies without self-referencing subqueries.
drop policy if exists "Users can read own role" on public.user_roles;
drop policy if exists "Admins read all user_roles" on public.user_roles;
drop policy if exists "Admins update user_roles" on public.user_roles;

create policy "Users can read own role"
  on public.user_roles
  for select
  using (
    auth.uid() = user_id
    or public.is_admin(auth.uid())
  );

create policy "Admins update user_roles"
  on public.user_roles
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Optional hardening: align other admin-write policies to helper too.
drop policy if exists "Admins write permissions" on public.permissions;
drop policy if exists "Admins write roles" on public.roles;
drop policy if exists "Admins write role_permissions" on public.role_permissions;

create policy "Admins write permissions"
  on public.permissions
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Admins write roles"
  on public.roles
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Admins write role_permissions"
  on public.role_permissions
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
