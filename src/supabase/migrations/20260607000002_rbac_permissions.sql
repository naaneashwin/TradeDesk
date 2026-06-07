-- ── Admin RBAC: Permissions & Role-Permission mapping ────────────────────────
-- Extends the existing user_roles table (which stores admin | user per user).
-- Adds fine-grained permissions that can be toggled per role.

-- 1. Permissions master table
create table if not exists public.permissions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,          -- e.g. 'view_journal'
  description text not null default '',
  module      text not null default 'general', -- e.g. 'content', 'analytics', 'admin'
  created_at  timestamptz not null default now()
);

-- 2. Roles master table (separate from user_roles which is per-user assignment)
create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,           -- 'admin', 'user', or any custom role
  description text not null default '',
  color       text not null default '#6b7280',
  created_at  timestamptz not null default now()
);

-- 3. Role ↔ Permission join table
create table if not exists public.role_permissions (
  role_id       uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- 4. Extend user_roles to reference the roles table (add role_id FK)
--    We keep the existing text 'role' column for the simple admin|user guard,
--    and add a role_id that points to the roles table for fine-grained RBAC.
alter table public.user_roles
  add column if not exists role_id uuid references public.roles(id) on delete set null,
  add column if not exists display_name text,
  add column if not exists status text not null default 'active' check (status in ('active', 'inactive'));

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.permissions     enable row level security;
alter table public.roles           enable row level security;
alter table public.role_permissions enable row level security;

-- All authenticated users can read
create policy "Authenticated read permissions"
  on public.permissions for select using (auth.role() = 'authenticated');

create policy "Authenticated read roles"
  on public.roles for select using (auth.role() = 'authenticated');

create policy "Authenticated read role_permissions"
  on public.role_permissions for select using (auth.role() = 'authenticated');

-- Admins can write everything (check via user_roles)
create policy "Admins write permissions"
  on public.permissions for all
  using  (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

create policy "Admins write roles"
  on public.roles for all
  using  (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

create policy "Admins write role_permissions"
  on public.role_permissions for all
  using  (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- Admins can read and update all user_roles
create policy "Admins read all user_roles"
  on public.user_roles for select
  using (
    auth.uid() = user_id
    or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin')
  );

create policy "Admins update user_roles"
  on public.user_roles for update
  using  (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'))
  with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

-- ── Seed: built-in roles ────────────────────────────────────────────────────
insert into public.roles (name, description, color) values
  ('admin', 'Full access to all features including admin panel', '#2d7a5f'),
  ('user',  'Standard access. No broker connect or admin panel', '#6b7280')
on conflict (name) do nothing;

-- ── Seed: built-in permissions ─────────────────────────────────────────────
insert into public.permissions (name, description, module) values
  ('view_strategies',    'View trading strategies',              'content'),
  ('edit_strategies',    'Create and edit strategies',           'content'),
  ('view_journal',       'View trade journal',                   'content'),
  ('log_trades',         'Log and edit trades',                  'content'),
  ('view_checklist',     'Access checklist library',             'content'),
  ('view_watchlist',     'Access watchlist',                     'content'),
  ('view_stats',         'View statistics and analytics',        'analytics'),
  ('view_calculator',    'Use the calculator tools',             'tools'),
  ('view_playbook',      'View strategy playbook',               'tools'),
  ('connect_broker',     'Connect and manage broker accounts',   'broker'),
  ('admin_panel',        'Access the admin panel',               'admin'),
  ('manage_users',       'View and manage user accounts',        'admin'),
  ('manage_roles',       'Create and edit roles',                'admin'),
  ('manage_permissions', 'Assign and revoke permissions',        'admin')
on conflict (name) do nothing;

-- ── Seed: assign all permissions to admin role ─────────────────────────────
insert into public.role_permissions (role_id, permission_id)
  select r.id, p.id
  from public.roles r cross join public.permissions p
  where r.name = 'admin'
on conflict do nothing;

-- ── Seed: assign non-admin permissions to user role ────────────────────────
insert into public.role_permissions (role_id, permission_id)
  select r.id, p.id
  from public.roles r join public.permissions p
    on p.name in ('view_strategies','edit_strategies','view_journal','log_trades',
                  'view_checklist','view_watchlist','view_stats','view_calculator','view_playbook')
  where r.name = 'user'
on conflict do nothing;

-- ── Backfill existing users: link role_id based on text role column ─────────
update public.user_roles ur
set role_id = r.id
from public.roles r
where r.name = ur.role
  and ur.role_id is null;

-- ── View: admin_users_view — joins auth.users with user_roles & roles ───────
-- This view is used by the admin panel to list all users.
create or replace view public.admin_users_view as
select
  au.id          as user_id,
  au.email,
  au.created_at,
  au.last_sign_in_at,
  coalesce(ur.display_name, split_part(au.email, '@', 1)) as display_name,
  coalesce(ur.role, 'user')   as role,
  coalesce(ur.status, 'active') as status,
  ur.role_id,
  r.name         as role_name,
  r.color        as role_color
from auth.users au
left join public.user_roles ur on ur.user_id = au.id
left join public.roles r on r.id = ur.role_id;

-- Grant access to authenticated users (RLS on underlying tables controls security)
grant select on public.admin_users_view to authenticated;
