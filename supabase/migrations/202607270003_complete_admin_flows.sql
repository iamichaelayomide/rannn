begin;

alter table public.pages
  add column if not exists has_unpublished_changes boolean not null default false;
alter table public.services
  add column if not exists has_unpublished_changes boolean not null default false;
alter table public.portfolio_items
  add column if not exists has_unpublished_changes boolean not null default false;
alter table public.project_invites
  add column if not exists revoked_at timestamptz;

create or replace function public.mark_cms_draft_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_table_name = 'pages'
     and (new.title, new.content, new.seo_title, new.seo_description)
         is distinct from
         (old.title, old.content, old.seo_title, old.seo_description) then
    new.has_unpublished_changes := true;
  elsif tg_table_name = 'services'
     and (new.title, new.slug, new.summary, new.description, new.image_url, new.position)
         is distinct from
         (old.title, old.slug, old.summary, old.description, old.image_url, old.position) then
    new.has_unpublished_changes := true;
  elsif tg_table_name = 'portfolio_items'
     and (new.title, new.slug, new.description, new.category, new.collection, new.year,
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

drop trigger if exists mark_pages_draft_change on public.pages;
create trigger mark_pages_draft_change
before update on public.pages
for each row execute function public.mark_cms_draft_change();

drop trigger if exists mark_services_draft_change on public.services;
create trigger mark_services_draft_change
before update on public.services
for each row execute function public.mark_cms_draft_change();

drop trigger if exists mark_portfolio_draft_change on public.portfolio_items;
create trigger mark_portfolio_draft_change
before update on public.portfolio_items
for each row execute function public.mark_cms_draft_change();

create or replace function public.publish_cms_entity(
  target_type text,
  target_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  snapshot jsonb;
  next_revision integer;
begin
  if not public.has_role(array['owner', 'content_manager']) then
    raise exception 'Content publishing permission is required';
  end if;

  if target_type = 'page' then
    select jsonb_build_object(
      'title', title,
      'slug', slug,
      'content', content,
      'seo_title', seo_title,
      'seo_description', seo_description
    )
    into snapshot
    from public.pages
    where id = target_id
    for update;

    if snapshot is null then raise exception 'Page not found'; end if;
    update public.pages
    set published_snapshot = snapshot,
        status = 'published',
        published_at = timezone('utc', now()),
        updated_by = auth.uid(),
        has_unpublished_changes = false
    where id = target_id;
  elsif target_type = 'service' then
    select to_jsonb(service_row)
      - 'published_snapshot' - 'created_at' - 'updated_at' - 'published_at'
      - 'has_unpublished_changes'
    into snapshot
    from public.services service_row
    where id = target_id
    for update;

    if snapshot is null then raise exception 'Service not found'; end if;
    update public.services
    set published_snapshot = snapshot,
        status = 'published',
        published_at = timezone('utc', now()),
        has_unpublished_changes = false
    where id = target_id;
  elsif target_type = 'portfolio' then
    select to_jsonb(portfolio_row)
      - 'published_snapshot' - 'created_at' - 'updated_at'
      - 'created_by' - 'updated_by' - 'published_at'
      - 'has_unpublished_changes'
    into snapshot
    from public.portfolio_items portfolio_row
    where id = target_id
    for update;

    if snapshot is null then raise exception 'Portfolio item not found'; end if;
    update public.portfolio_items
    set published_snapshot = snapshot,
        status = 'published',
        published_at = timezone('utc', now()),
        updated_by = auth.uid(),
        has_unpublished_changes = false
    where id = target_id;
  else
    raise exception 'Unsupported content type';
  end if;

  select coalesce(max(revision_number), 0) + 1
  into next_revision
  from public.content_revisions
  where entity_type = target_type and entity_id = target_id;

  insert into public.content_revisions (
    entity_type, entity_id, revision_number, snapshot, published_by
  )
  values (target_type, target_id, next_revision, snapshot, auth.uid());

  return snapshot;
end;
$$;

create or replace function public.save_invoice_draft(
  target_invoice_id uuid,
  target_project_id uuid,
  target_invoice_number text,
  target_due_date date,
  target_tax numeric,
  target_notes text,
  target_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_id uuid;
  calculated_subtotal numeric(14,2);
begin
  if not public.has_role(array['owner', 'finance']) then
    raise exception 'Billing permission is required';
  end if;
  if jsonb_typeof(target_items) <> 'array' or jsonb_array_length(target_items) = 0 then
    raise exception 'Add at least one invoice item';
  end if;

  select coalesce(sum(
    greatest((item->>'quantity')::numeric, 0)
    * greatest((item->>'unit_price')::numeric, 0)
  ), 0)
  into calculated_subtotal
  from jsonb_array_elements(target_items) item;

  if target_invoice_id is null then
    insert into public.invoices (
      project_id, invoice_number, due_date, subtotal, tax, notes,
      status, currency, created_by
    )
    values (
      target_project_id, trim(target_invoice_number), target_due_date,
      calculated_subtotal, greatest(coalesce(target_tax, 0), 0),
      nullif(trim(target_notes), ''), 'draft', 'NGN', auth.uid()
    )
    returning id into saved_id;
  else
    update public.invoices
    set project_id = target_project_id,
        invoice_number = trim(target_invoice_number),
        due_date = target_due_date,
        subtotal = calculated_subtotal,
        tax = greatest(coalesce(target_tax, 0), 0),
        notes = nullif(trim(target_notes), '')
    where id = target_invoice_id and status = 'draft'
    returning id into saved_id;
    if saved_id is null then raise exception 'Only draft invoices can be edited'; end if;
    delete from public.invoice_items where invoice_id = saved_id;
  end if;

  insert into public.invoice_items (
    invoice_id, description, quantity, unit_price, position
  )
  select
    saved_id,
    trim(item->>'description'),
    greatest((item->>'quantity')::numeric, 0.01),
    greatest((item->>'unit_price')::numeric, 0),
    ordinality - 1
  from jsonb_array_elements(target_items) with ordinality as rows(item, ordinality)
  where trim(coalesce(item->>'description', '')) <> '';

  if not exists (select 1 from public.invoice_items where invoice_id = saved_id) then
    raise exception 'Each invoice needs a described line item';
  end if;

  insert into public.activities (actor_id, project_id, action, entity_type, entity_id)
  values (
    auth.uid(), target_project_id,
    case when target_invoice_id is null then 'created' else 'updated' end,
    'invoice', saved_id::text
  );
  return saved_id;
end;
$$;

create or replace function public.transition_invoice(
  target_invoice_id uuid,
  target_status text,
  target_payment_reference text default null
)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  changed public.invoices;
begin
  if not public.has_role(array['owner', 'finance']) then
    raise exception 'Billing permission is required';
  end if;
  if target_status = 'paid'
     and nullif(trim(coalesce(target_payment_reference, '')), '') is null then
    raise exception 'Add a payment reference or method';
  end if;

  update public.invoices
  set status = target_status,
      payment_reference = case
        when target_status = 'paid' then trim(target_payment_reference)
        else payment_reference
      end
  where id = target_invoice_id
  returning * into changed;
  if changed.id is null then raise exception 'Invoice not found'; end if;

  insert into public.activities (actor_id, project_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), changed.project_id, 'status_changed', 'invoice',
    changed.id::text, jsonb_build_object('status', target_status)
  );
  return changed;
end;
$$;

revoke all on function public.save_invoice_draft(uuid, uuid, text, date, numeric, text, jsonb) from public;
grant execute on function public.save_invoice_draft(uuid, uuid, text, date, numeric, text, jsonb) to authenticated;
revoke all on function public.transition_invoice(uuid, text, text) from public;
grant execute on function public.transition_invoice(uuid, text, text) to authenticated;

create or replace function public.claim_project_invite(invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_invite public.project_invites;
begin
  select *
  into matched_invite
  from public.project_invites
  where token = invite_token
    and accepted_at is null
    and revoked_at is null
    and expires_at > timezone('utc', now())
  for update;

  if matched_invite.id is null then
    raise exception 'This invitation is invalid, expired, or no longer active';
  end if;
  if lower(auth.jwt()->>'email') <> lower(matched_invite.email) then
    raise exception 'Sign in with the invited email address';
  end if;

  insert into public.project_members (project_id, user_id, member_role)
  values (matched_invite.project_id, auth.uid(), 'client')
  on conflict (project_id, user_id) do update set member_role = excluded.member_role;

  update public.project_invites
  set accepted_at = timezone('utc', now())
  where id = matched_invite.id;
  return matched_invite.project_id;
end;
$$;

create or replace function public.protect_last_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'owner' and new.role <> 'owner'
     and (select count(*) from public.profiles where role = 'owner') <= 1 then
    raise exception 'The workspace must keep at least one owner';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_last_owner on public.profiles;
create trigger protect_last_owner
before update on public.profiles
for each row execute function public.protect_last_owner();

create or replace function public.media_asset_usage_details(target_id uuid)
returns table(source_type text, source_label text, record_id uuid, record_title text)
language sql
stable
security definer
set search_path = public
as $$
  with target as (
    select public_url
    from public.media_assets
    where id = target_id
  )
  select 'page', 'Page', p.id, case when p.slug = 'global' then 'Site-wide content' else p.title end
  from public.pages p, target
  where target.public_url is not null
    and (
      p.content::text like '%' || target.public_url || '%'
      or coalesce(p.published_snapshot::text, '') like '%' || target.public_url || '%'
    )
  union all
  select 'service', 'Service', s.id, s.title
  from public.services s, target
  where target.public_url is not null
    and (
      s.image_url = target.public_url
      or coalesce(s.published_snapshot::text, '') like '%' || target.public_url || '%'
    )
  union all
  select 'portfolio', 'Portfolio item', p.id, p.title
  from public.portfolio_items p, target
  where target.public_url is not null
    and (
      p.thumbnail_src = target.public_url
      or p.preview_src = target.public_url
      or p.original_url = target.public_url
      or coalesce(p.published_snapshot::text, '') like '%' || target.public_url || '%'
    );
$$;

revoke all on function public.media_asset_usage_details(uuid) from public;
grant execute on function public.media_asset_usage_details(uuid) to authenticated;

commit;
