begin;

alter table if exists public.bookings enable row level security;
alter table if exists public.bookings force row level security;
alter table if exists public.legacy_projects enable row level security;
alter table if exists public.legacy_projects force row level security;
alter table if exists public.legacy_services enable row level security;
alter table if exists public.legacy_services force row level security;
alter table if exists public.portfolio enable row level security;
alter table if exists public.portfolio force row level security;
alter table if exists public.site_content enable row level security;
alter table if exists public.site_content force row level security;

revoke all on table public.bookings from public, anon, authenticated;
revoke all on table public.legacy_projects from public, anon, authenticated;
revoke all on table public.legacy_services from public, anon, authenticated;
revoke all on table public.portfolio from public, anon, authenticated;
revoke all on table public.site_content from public, anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_class as classes
    join pg_namespace as namespaces
      on namespaces.oid = classes.relnamespace
    where namespaces.nspname = 'public'
      and classes.relkind in ('r', 'p')
      and not classes.relrowsecurity
  ) then
    raise exception 'A public table still has row-level security disabled';
  end if;
end
$$;

drop function if exists public.list_public_tables_without_rls();

commit;
