create or replace function public.list_public_tables_without_rls()
returns table (table_name text)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select classes.relname::text
  from pg_class as classes
  join pg_namespace as namespaces
    on namespaces.oid = classes.relnamespace
  where namespaces.nspname = 'public'
    and classes.relkind in ('r', 'p')
    and not classes.relrowsecurity
  order by classes.relname;
$$;

revoke all on function public.list_public_tables_without_rls() from public, anon, authenticated;
grant execute on function public.list_public_tables_without_rls() to service_role;
