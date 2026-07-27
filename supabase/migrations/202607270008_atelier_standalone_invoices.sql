begin;

alter table public.invoices
  add column if not exists client_id uuid references public.clients(id) on delete restrict,
  add column if not exists job_reference text;

update public.invoices invoice
set client_id = project.client_id
from public.projects project
where project.id = invoice.project_id
  and invoice.client_id is null;

alter table public.invoices
  alter column project_id drop not null,
  alter column client_id set not null;

create index if not exists invoices_client_id_idx on public.invoices(client_id);

create or replace function public.enforce_invoice_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    if old.status = 'draft' and new.status not in ('open', 'void') then
      raise exception 'A draft invoice can only be opened or voided';
    elsif old.status = 'open' and new.status not in ('paid', 'void', 'uncollectible') then
      raise exception 'An open invoice can only be paid, voided, or marked uncollectible';
    elsif old.status in ('paid', 'void') then
      raise exception 'Paid and void invoices are terminal';
    elsif old.status = 'uncollectible' and new.status not in ('paid', 'void') then
      raise exception 'An uncollectible invoice can only be paid or voided';
    end if;
  end if;

  if old.status <> 'draft' and (
    new.project_id is distinct from old.project_id
    or new.client_id is distinct from old.client_id
    or new.job_reference is distinct from old.job_reference
    or new.invoice_number is distinct from old.invoice_number
    or new.currency is distinct from old.currency
    or new.subtotal is distinct from old.subtotal
    or new.tax is distinct from old.tax
  ) then
    raise exception 'Finalized invoice financial details are locked';
  end if;

  if new.status = 'open' and new.issued_at is null then
    new.issued_at = timezone('utc', now());
  end if;
  if new.status = 'paid' and new.paid_at is null then
    new.paid_at = timezone('utc', now());
  end if;
  return new;
end;
$$;

drop policy if exists "invoices visible to project" on public.invoices;
drop policy if exists "invoices visible to workspace or project" on public.invoices;
create policy "invoices visible to workspace or project" on public.invoices
for select using (
  public.is_internal_user()
  or (project_id is not null and public.can_access_project(project_id))
);

drop policy if exists "invoice items visible with invoice" on public.invoice_items;
create policy "invoice items visible with invoice" on public.invoice_items
for select using (
  exists (
    select 1
    from public.invoices invoice
    where invoice.id = invoice_items.invoice_id
      and (
        public.is_internal_user()
        or (
          invoice.project_id is not null
          and public.can_access_project(invoice.project_id)
        )
      )
  )
);

drop function if exists public.save_invoice_draft(
  uuid, uuid, text, date, numeric, text, jsonb
);

create or replace function public.save_invoice_draft(
  target_invoice_id uuid,
  target_project_id uuid,
  target_client_id uuid,
  target_new_client jsonb,
  target_job_reference text,
  target_invoice_number text,
  target_currency text,
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
  resolved_client_id uuid := target_client_id;
  project_client_id uuid;
  calculated_subtotal numeric(14,2);
  normalized_currency text := upper(trim(coalesce(target_currency, 'NGN')));
begin
  if not public.has_role(array['owner', 'finance']) then
    raise exception 'Billing permission is required';
  end if;
  if nullif(trim(coalesce(target_invoice_number, '')), '') is null then
    raise exception 'Add an invoice number';
  end if;
  if normalized_currency not in ('NGN', 'USD', 'GBP') then
    raise exception 'Choose NGN, USD, or GBP';
  end if;
  if jsonb_typeof(target_items) <> 'array' or jsonb_array_length(target_items) = 0 then
    raise exception 'Add at least one invoice item';
  end if;

  if target_project_id is not null then
    select client_id
    into project_client_id
    from public.projects
    where id = target_project_id
      and archived_at is null;

    if project_client_id is null then
      raise exception 'Choose an active project';
    end if;
    if resolved_client_id is not null and resolved_client_id <> project_client_id then
      raise exception 'The selected client does not belong to this project';
    end if;
    resolved_client_id := project_client_id;
  elsif resolved_client_id is null then
    if nullif(trim(coalesce(target_new_client->>'name', '')), '') is null then
      raise exception 'Choose a client or add a new client';
    end if;

    insert into public.clients (
      name, company, email, phone, created_by
    )
    values (
      trim(target_new_client->>'name'),
      nullif(trim(target_new_client->>'company'), ''),
      nullif(trim(target_new_client->>'email'), ''),
      nullif(trim(target_new_client->>'phone'), ''),
      auth.uid()
    )
    returning id into resolved_client_id;
  end if;

  if not exists (
    select 1 from public.clients
    where id = resolved_client_id and archived_at is null
  ) then
    raise exception 'Choose an active client';
  end if;

  select coalesce(sum(
    greatest((item->>'quantity')::numeric, 0)
    * greatest((item->>'unit_price')::numeric, 0)
  ), 0)
  into calculated_subtotal
  from jsonb_array_elements(target_items) item;

  if target_invoice_id is null then
    insert into public.invoices (
      project_id, client_id, job_reference, invoice_number, due_date,
      subtotal, tax, notes, status, currency, created_by
    )
    values (
      target_project_id, resolved_client_id,
      nullif(trim(coalesce(target_job_reference, '')), ''),
      trim(target_invoice_number), target_due_date, calculated_subtotal,
      greatest(coalesce(target_tax, 0), 0),
      nullif(trim(coalesce(target_notes, '')), ''),
      'draft', normalized_currency, auth.uid()
    )
    returning id into saved_id;
  else
    update public.invoices
    set project_id = target_project_id,
        client_id = resolved_client_id,
        job_reference = nullif(trim(coalesce(target_job_reference, '')), ''),
        invoice_number = trim(target_invoice_number),
        currency = normalized_currency,
        due_date = target_due_date,
        subtotal = calculated_subtotal,
        tax = greatest(coalesce(target_tax, 0), 0),
        notes = nullif(trim(coalesce(target_notes, '')), '')
    where id = target_invoice_id and status = 'draft'
    returning id into saved_id;

    if saved_id is null then
      raise exception 'Only draft invoices can be edited';
    end if;
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

  insert into public.activities (
    actor_id, project_id, action, entity_type, entity_id,
    metadata
  )
  values (
    auth.uid(), target_project_id,
    case when target_invoice_id is null then 'created' else 'updated' end,
    'invoice', saved_id::text,
    jsonb_build_object('client_id', resolved_client_id)
  );

  return saved_id;
end;
$$;

revoke all on function public.save_invoice_draft(
  uuid, uuid, uuid, jsonb, text, text, text, date, numeric, text, jsonb
) from public;
grant execute on function public.save_invoice_draft(
  uuid, uuid, uuid, jsonb, text, text, text, date, numeric, text, jsonb
) to authenticated;

-- Publish the corrected current brand without rewriting immutable old revisions.
update public.pages
set title = replace(title, 'Olympus Studio', 'Olympus Atelier'),
    seo_title = replace(seo_title, 'Olympus Studio', 'Olympus Atelier'),
    seo_description = replace(
      replace(seo_description, 'Olympus Studio', 'Olympus Atelier'),
      'media house', 'atelier'
    ),
    content = replace(
      replace(
        replace(content::text, 'Olympus Studio', 'Olympus Atelier'),
        'Premium Media House', 'Premium Atelier'
      ),
      'creative studio', 'creative atelier'
    )::jsonb,
    published_snapshot = case
      when published_snapshot is null then null
      else replace(
        replace(
          replace(published_snapshot::text, 'Olympus Studio', 'Olympus Atelier'),
          'Premium Media House', 'Premium Atelier'
        ),
        'creative studio', 'creative atelier'
      )::jsonb
    end,
    has_unpublished_changes = false,
    published_at = case
      when published_snapshot is null then published_at
      else timezone('utc', now())
    end;

update public.services
set title = replace(title, 'Olympus Studio', 'Olympus Atelier'),
    summary = replace(summary, 'Olympus Studio', 'Olympus Atelier'),
    description = replace(description, 'Olympus Studio', 'Olympus Atelier'),
    published_snapshot = case
      when published_snapshot is null then null
      else replace(published_snapshot::text, 'Olympus Studio', 'Olympus Atelier')::jsonb
    end,
    has_unpublished_changes = false;

update public.portfolio_items
set alt_text = replace(alt_text, 'Olympus Studio', 'Olympus Atelier'),
    published_snapshot = case
      when published_snapshot is null then null
      else replace(published_snapshot::text, 'Olympus Studio', 'Olympus Atelier')::jsonb
    end,
    has_unpublished_changes = false;

insert into public.content_revisions (
  entity_type, entity_id, revision_number, snapshot, published_by
)
select
  'page',
  page.id,
  coalesce((
    select max(revision.revision_number)
    from public.content_revisions revision
    where revision.entity_type = 'page'
      and revision.entity_id = page.id
  ), 0) + 1,
  page.published_snapshot,
  null
from public.pages page
where page.published_snapshot is not null
  and page.published_snapshot::text like '%Olympus Atelier%';

commit;
