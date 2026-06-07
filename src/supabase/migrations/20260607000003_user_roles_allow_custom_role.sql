-- Allow assigning custom role names from public.roles in user_roles.role
-- Keep 'admin' checks in app/RLS unchanged; this only removes the restrictive check.

do $$
declare
  c record;
begin
  for c in (
    select conname
    from pg_constraint
    where conrelid = 'public.user_roles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
      and pg_get_constraintdef(oid) ilike '%admin%'
      and pg_get_constraintdef(oid) ilike '%user%'
  ) loop
    execute format('alter table public.user_roles drop constraint %I', c.conname);
  end loop;
end $$;
