begin;

alter table public.clients
  add column if not exists relationship_stage text not null default 'lead',
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists last_contacted_at timestamptz,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists archived_at timestamptz;

alter table public.clients
  drop constraint if exists clients_relationship_stage_check;
alter table public.clients
  add constraint clients_relationship_stage_check
  check (relationship_stage in ('lead', 'current', 'past', 'on_hold'));

alter table public.projects
  add column if not exists archived_at timestamptz;

update public.clients client
set relationship_stage = case
  when exists (
    select 1 from public.projects project
    where project.client_id = client.id
      and project.archived_at is null
      and project.status in ('active', 'on_hold')
  ) then 'current'
  when exists (
    select 1 from public.projects project
    where project.client_id = client.id
  ) then 'past'
  else 'lead'
end
where client.relationship_stage = 'lead';

create index if not exists clients_relationship_stage_idx
  on public.clients (relationship_stage);
create index if not exists clients_archived_at_idx
  on public.clients (archived_at);
create index if not exists clients_next_follow_up_at_idx
  on public.clients (next_follow_up_at);
create index if not exists projects_archived_at_idx
  on public.projects (archived_at);

drop trigger if exists mark_pages_draft_change on public.pages;
drop trigger if exists mark_services_draft_change on public.services;
drop trigger if exists mark_portfolio_draft_change on public.portfolio_items;
drop function if exists public.mark_cms_draft_change();

create or replace function public.mark_page_draft_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (new.title, new.content, new.seo_title, new.seo_description)
      is distinct from
     (old.title, old.content, old.seo_title, old.seo_description) then
    new.has_unpublished_changes := true;
  end if;
  return new;
end;
$$;

create or replace function public.mark_service_draft_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (new.title, new.slug, new.summary, new.description, new.image_url, new.position)
      is distinct from
     (old.title, old.slug, old.summary, old.description, old.image_url, old.position) then
    new.has_unpublished_changes := true;
  end if;
  return new;
end;
$$;

create or replace function public.mark_portfolio_draft_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (new.title, new.slug, new.description, new.category, new.collection, new.year,
      new.media_type, new.thumbnail_src, new.preview_src, new.original_url,
      new.alt_text, new.featured, new.position)
      is distinct from
     (old.title, old.slug, old.description, old.category, old.collection, old.year,
      old.media_type, old.thumbnail_src, old.preview_src, old.original_url,
      old.alt_text, old.featured, old.position) then
    new.has_unpublished_changes := true;
  end if;
  return new;
end;
$$;

create trigger mark_pages_draft_change
before update on public.pages
for each row execute function public.mark_page_draft_change();

create trigger mark_services_draft_change
before update on public.services
for each row execute function public.mark_service_draft_change();

create trigger mark_portfolio_draft_change
before update on public.portfolio_items
for each row execute function public.mark_portfolio_draft_change();

create or replace function public.set_project_archived(
  target_project_id uuid,
  target_archived boolean
)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_project public.projects;
begin
  if not public.has_role(array['owner', 'project_manager']) then
    raise exception 'Project management permission is required';
  end if;

  update public.projects
  set archived_at = case
        when target_archived then coalesce(archived_at, timezone('utc', now()))
        else null
      end,
      updated_at = timezone('utc', now())
  where id = target_project_id
  returning * into saved_project;

  if saved_project.id is null then
    raise exception 'Project not found';
  end if;

  insert into public.activities (
    actor_id, project_id, action, entity_type, entity_id, metadata
  )
  values (
    auth.uid(), saved_project.id,
    case when target_archived then 'archived' else 'restored' end,
    'project', saved_project.id::text,
    jsonb_build_object('archived', target_archived)
  );

  return saved_project;
end;
$$;

create or replace function public.save_sitewide_collection(
  target_page_id uuid,
  target_collection text,
  target_index integer,
  target_item jsonb,
  target_publish boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  page_row public.pages;
  collection_items jsonb;
  updated_content jsonb;
  published_snapshot jsonb;
begin
  if not public.has_role(array['owner', 'content_manager']) then
    raise exception 'Content management permission is required';
  end if;
  if target_collection not in ('team', 'testimonials', 'faqs', 'partners') then
    raise exception 'Unsupported site-wide collection';
  end if;
  if target_item is null or jsonb_typeof(target_item) <> 'object' then
    raise exception 'Collection item must be an object';
  end if;

  select *
  into page_row
  from public.pages
  where id = target_page_id and slug = 'global'
  for update;

  if page_row.id is null then
    raise exception 'Site-wide content was not found';
  end if;

  collection_items := coalesce(page_row.content -> target_collection, '[]'::jsonb);
  if jsonb_typeof(collection_items) <> 'array' then
    collection_items := '[]'::jsonb;
  end if;

  if target_index = -1 then
    collection_items := collection_items || jsonb_build_array(target_item);
  elsif target_index >= 0 and target_index < jsonb_array_length(collection_items) then
    collection_items := jsonb_set(
      collection_items,
      array[target_index::text],
      target_item,
      false
    );
  else
    raise exception 'Collection item was not found';
  end if;

  updated_content := jsonb_set(
    coalesce(page_row.content, '{}'::jsonb),
    array[target_collection],
    collection_items,
    true
  );

  update public.pages
  set content = updated_content,
      updated_by = auth.uid(),
      updated_at = timezone('utc', now())
  where id = page_row.id;

  if target_publish then
    published_snapshot := public.publish_cms_entity('page', page_row.id);
  end if;

  return jsonb_build_object(
    'content', updated_content,
    'published', target_publish,
    'snapshot', published_snapshot
  );
end;
$$;

create or replace function public.get_crm_dashboard(months_back integer default 12)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  month_count integer := greatest(1, least(coalesce(months_back, 12), 36));
  current_month date := date_trunc('month', timezone('utc', now()))::date;
  result jsonb;
begin
  if not public.is_internal_user() then
    raise exception 'Workspace access is required';
  end if;

  with months as (
    select generate_series(
      current_month - ((month_count - 1) || ' months')::interval,
      current_month,
      interval '1 month'
    )::date as month_start
  ),
  monthly as (
    select
      month_start,
      (
        select count(distinct project.client_id)
        from public.projects project
        where coalesce(project.start_date, project.created_at::date)
                < month_start + interval '1 month'
          and greatest(
                coalesce(project.start_date, project.created_at::date),
                coalesce(project.due_date, project.start_date, project.created_at::date)
              ) >= month_start
      ) as clients_worked,
      coalesce((
        select jsonb_agg(
          jsonb_build_object('currency', paid.currency, 'total', paid.total)
          order by paid.currency
        )
        from (
          select invoice.currency, sum(invoice.total)::numeric as total
          from public.invoices invoice
          where invoice.status = 'paid'
            and invoice.paid_at >= month_start
            and invoice.paid_at < month_start + interval '1 month'
          group by invoice.currency
        ) paid
      ), '[]'::jsonb) as revenue
    from months
  )
  select jsonb_build_object(
    'activeClients', (
      select count(distinct project.client_id)
      from public.projects project
      join public.clients client on client.id = project.client_id
      where project.archived_at is null
        and client.archived_at is null
        and project.status in ('active', 'on_hold')
    ),
    'clientsWorkedThisMonth', (
      select count(distinct project.client_id)
      from public.projects project
      where coalesce(project.start_date, project.created_at::date)
              < current_month + interval '1 month'
        and greatest(
              coalesce(project.start_date, project.created_at::date),
              coalesce(project.due_date, project.start_date, project.created_at::date)
            ) >= current_month
    ),
    'newClientsThisMonth', (
      select count(*)
      from public.clients client
      where client.created_at >= current_month
        and client.created_at < current_month + interval '1 month'
    ),
    'paidThisMonth', coalesce((
      select jsonb_agg(
        jsonb_build_object('currency', paid.currency, 'total', paid.total)
        order by paid.currency
      )
      from (
        select invoice.currency, sum(invoice.total)::numeric as total
        from public.invoices invoice
        where invoice.status = 'paid'
          and invoice.paid_at >= current_month
          and invoice.paid_at < current_month + interval '1 month'
        group by invoice.currency
      ) paid
    ), '[]'::jsonb),
    'outstanding', coalesce((
      select jsonb_agg(
        jsonb_build_object('currency', outstanding.currency, 'total', outstanding.total)
        order by outstanding.currency
      )
      from (
        select invoice.currency, sum(invoice.total)::numeric as total
        from public.invoices invoice
        where invoice.status in ('open', 'uncollectible')
        group by invoice.currency
      ) outstanding
    ), '[]'::jsonb),
    'months', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'month', monthly.month_start,
          'clientsWorked', monthly.clients_worked,
          'revenue', monthly.revenue
        )
        order by monthly.month_start
      )
      from monthly
    ), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

revoke all on function public.set_project_archived(uuid, boolean) from public;
revoke all on function public.save_sitewide_collection(uuid, text, integer, jsonb, boolean) from public;
revoke all on function public.get_crm_dashboard(integer) from public;
grant execute on function public.set_project_archived(uuid, boolean) to authenticated;
grant execute on function public.save_sitewide_collection(uuid, text, integer, jsonb, boolean) to authenticated;
grant execute on function public.get_crm_dashboard(integer) to authenticated;

commit;
