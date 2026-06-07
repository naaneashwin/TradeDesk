-- Fix Supabase security warning for public.admin_users_view.
-- Ensure the view runs with the querying user's permissions.

create or replace view public.admin_users_view
with (security_invoker = on) as
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
left join public.roles r on r.id = ur.role_id;

grant select on public.admin_users_view to authenticated;
