begin;

create table if not exists public.billing_settings (
  id boolean primary key default true check (id),
  business_name text not null default 'Olympus Atelier',
  address text not null,
  payer_id text,
  tin text,
  bank_name text,
  account_name text,
  account_number text,
  contact_phone text,
  contact_email text,
  default_vat_rate numeric(5,2) not null default 7.5 check (default_vat_rate between 0 and 100),
  deposit_percent numeric(5,2) not null default 70 check (deposit_percent between 0 and 100),
  policy_text text,
  logo_url text,
  watermark_url text,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.billing_settings (
  id, business_name, address, payer_id, tin, bank_name, account_name,
  account_number, contact_phone, default_vat_rate, deposit_percent, policy_text
)
values (
  true,
  'Olympus Atelier',
  'D2, Progressive Estate, Igbe Road, Igbogbo, Ikorodu, Lagos',
  'N-37691946',
  '2622436692080',
  'Kuda',
  'IHUA John Iyumame',
  '2017693114',
  '+234 702 645 6357',
  7.5,
  70,
  'A 70% deposit confirms the booking. The outstanding balance is due on completion.'
)
on conflict (id) do nothing;

create table if not exists public.billing_document_sequences (
  document_kind text not null check (document_kind in ('receipt', 'debit', 'credit')),
  document_year integer not null,
  last_value integer not null default 0,
  primary key (document_kind, document_year)
);

alter table public.invoices
  add column if not exists vat_rate numeric(5,2) not null default 7.5,
  add column if not exists document_snapshot jsonb;

alter table public.invoices drop constraint if exists invoices_status_check;
alter table public.invoices
  add constraint invoices_status_check
  check (status in ('draft', 'open', 'partially_paid', 'paid', 'credited', 'void', 'uncollectible'));

create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  receipt_number text not null unique,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null check (currency in ('NGN', 'USD', 'GBP')),
  paid_at timestamptz not null,
  method text not null,
  reference text,
  notes text,
  status text not null default 'recorded' check (status in ('recorded', 'void')),
  document_snapshot jsonb,
  created_by uuid references public.profiles(id),
  voided_at timestamptz,
  voided_by uuid references public.profiles(id),
  void_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.invoice_adjustments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  kind text not null check (kind in ('debit', 'credit')),
  note_number text unique,
  status text not null default 'draft' check (status in ('draft', 'issued', 'void')),
  reason text not null,
  notes text,
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  vat_rate numeric(5,2) not null default 7.5 check (vat_rate between 0 and 100),
  tax numeric(14,2) not null default 0 check (tax >= 0),
  total numeric(14,2) generated always as (subtotal + tax) stored,
  document_snapshot jsonb,
  created_by uuid references public.profiles(id),
  issued_at timestamptz,
  voided_at timestamptz,
  voided_by uuid references public.profiles(id),
  void_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.invoice_adjustment_items (
  id uuid primary key default gen_random_uuid(),
  adjustment_id uuid not null references public.invoice_adjustments(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists invoice_payments_invoice_id_idx on public.invoice_payments(invoice_id);
create index if not exists invoice_payments_paid_at_idx on public.invoice_payments(paid_at);
create index if not exists invoice_adjustments_invoice_id_idx on public.invoice_adjustments(invoice_id);
create index if not exists invoice_adjustment_items_adjustment_id_idx on public.invoice_adjustment_items(adjustment_id);

create or replace function public.next_billing_document_number(target_kind text, target_date timestamptz default timezone('utc', now()))
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  number_value integer;
  year_value integer := extract(year from target_date)::integer;
  prefix text;
begin
  if target_kind not in ('receipt', 'debit', 'credit') then
    raise exception 'Unsupported billing document type';
  end if;
  prefix := case target_kind when 'receipt' then 'RCP' when 'debit' then 'DBN' else 'CRN' end;
  insert into public.billing_document_sequences(document_kind, document_year, last_value)
  values (target_kind, year_value, 1)
  on conflict (document_kind, document_year)
  do update set last_value = public.billing_document_sequences.last_value + 1
  returning last_value into number_value;
  return prefix || '-' || year_value || '-' || lpad(number_value::text, 3, '0');
end;
$$;

create or replace function public.invoice_snapshot(target_invoice_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'invoice', to_jsonb(invoice),
    'client', to_jsonb(client),
    'project', case when project.id is null then null else to_jsonb(project) end,
    'items', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.position)
      from public.invoice_items item where item.invoice_id = invoice.id
    ), '[]'::jsonb),
    'settings', (select to_jsonb(settings) from public.billing_settings settings where settings.id = true)
  )
  from public.invoices invoice
  join public.clients client on client.id = invoice.client_id
  left join public.projects project on project.id = invoice.project_id
  where invoice.id = target_invoice_id
$$;

create or replace function public.get_invoice_balance(target_invoice_id uuid)
returns table (
  original_total numeric,
  debit_total numeric,
  credit_total numeric,
  adjusted_total numeric,
  paid_amount numeric,
  outstanding_balance numeric,
  balance_state text
)
language sql
security definer
set search_path = public
as $$
  with totals as (
    select
      invoice.total::numeric as original_total,
      coalesce(sum(adjustment.total) filter (where adjustment.kind = 'debit' and adjustment.status = 'issued'), 0)::numeric as debit_total,
      coalesce(sum(adjustment.total) filter (where adjustment.kind = 'credit' and adjustment.status = 'issued'), 0)::numeric as credit_total
    from public.invoices invoice
    left join public.invoice_adjustments adjustment on adjustment.invoice_id = invoice.id
    where invoice.id = target_invoice_id
    group by invoice.total
  ),
  payments as (
    select coalesce(sum(payment.amount), 0)::numeric as paid_amount
    from public.invoice_payments payment
    where payment.invoice_id = target_invoice_id and payment.status = 'recorded'
  )
  select
    totals.original_total,
    totals.debit_total,
    totals.credit_total,
    (totals.original_total + totals.debit_total - totals.credit_total)::numeric,
    payments.paid_amount,
    greatest(totals.original_total + totals.debit_total - totals.credit_total - payments.paid_amount, 0)::numeric,
    case
      when totals.original_total + totals.debit_total - totals.credit_total - payments.paid_amount <= 0 then 'paid'
      when payments.paid_amount > 0 then 'partially_paid'
      when totals.credit_total > 0 then 'credited'
      else 'unpaid'
    end
  from totals cross join payments
$$;

create or replace function public.refresh_invoice_balance_state(target_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  next_state text;
  current_state text;
begin
  select status into current_state from public.invoices where id = target_invoice_id;
  if current_state in ('draft', 'void') then return; end if;
  select balance_state into next_state from public.get_invoice_balance(target_invoice_id);
  update public.invoices
  set status = case when next_state = 'unpaid' then
      case when current_state = 'uncollectible' then 'uncollectible' else 'open' end
    else next_state end,
    paid_at = case when next_state = 'paid' then coalesce(paid_at, timezone('utc', now())) else null end,
    updated_at = timezone('utc', now())
  where id = target_invoice_id;
end;
$$;

create or replace function public.enforce_invoice_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    if old.status = 'draft' and new.status not in ('open', 'void') then
      raise exception 'A draft invoice can only be finalized or voided';
    elsif old.status = 'void' then
      raise exception 'A void invoice is terminal';
    elsif new.status = 'draft' then
      raise exception 'A finalized invoice cannot return to draft';
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
    or new.vat_rate is distinct from old.vat_rate
  ) then
    raise exception 'Finalized invoice financial details are locked';
  end if;
  if new.status = 'open' and new.issued_at is null then
    new.issued_at = timezone('utc', now());
  end if;
  return new;
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
  if not public.has_role(array['owner', 'finance']) then raise exception 'Billing permission is required'; end if;
  if target_status not in ('open', 'void', 'uncollectible') then
    raise exception 'Use Record payment for invoice payments';
  end if;
  update public.invoices
  set status = target_status,
      document_snapshot = case
        when target_status = 'open' and document_snapshot is null then public.invoice_snapshot(id)
        else document_snapshot
      end,
      updated_at = timezone('utc', now())
  where id = target_invoice_id
  returning * into changed;
  if changed.id is null then raise exception 'Invoice not found'; end if;
  insert into public.activities(actor_id, project_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), changed.project_id, target_status, 'invoice', changed.id::text, '{}'::jsonb);
  return changed;
end;
$$;

create or replace function public.record_invoice_payment(
  target_invoice_id uuid,
  target_amount numeric,
  target_paid_at timestamptz,
  target_method text,
  target_reference text default null,
  target_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invoice_record public.invoices;
  balance_record record;
  payment_id uuid;
  receipt text;
  payment_snapshot jsonb;
begin
  if not public.has_role(array['owner', 'finance']) then raise exception 'Billing permission is required'; end if;
  select * into invoice_record from public.invoices where id = target_invoice_id for update;
  if invoice_record.id is null or invoice_record.status in ('draft', 'void') then raise exception 'Finalize the invoice before recording payment'; end if;
  select * into balance_record from public.get_invoice_balance(target_invoice_id);
  if target_amount <= 0 or target_amount > balance_record.outstanding_balance then
    raise exception 'Payment must be greater than zero and no more than the outstanding balance';
  end if;
  if nullif(trim(coalesce(target_method, '')), '') is null then raise exception 'Add the payment method'; end if;
  receipt := public.next_billing_document_number('receipt', coalesce(target_paid_at, timezone('utc', now())));
  payment_snapshot := jsonb_build_object(
    'invoice_snapshot', coalesce(invoice_record.document_snapshot, public.invoice_snapshot(invoice_record.id)),
    'receipt_number', receipt,
    'amount', target_amount,
    'paid_at', coalesce(target_paid_at, timezone('utc', now())),
    'method', trim(target_method),
    'reference', nullif(trim(coalesce(target_reference, '')), ''),
    'notes', nullif(trim(coalesce(target_notes, '')), ''),
    'balance_before', balance_record.outstanding_balance,
    'balance_after', balance_record.outstanding_balance - target_amount
  );
  insert into public.invoice_payments(
    invoice_id, receipt_number, amount, currency, paid_at, method, reference,
    notes, document_snapshot, created_by
  ) values (
    invoice_record.id, receipt, target_amount, invoice_record.currency,
    coalesce(target_paid_at, timezone('utc', now())), trim(target_method),
    nullif(trim(coalesce(target_reference, '')), ''), nullif(trim(coalesce(target_notes, '')), ''),
    payment_snapshot, auth.uid()
  ) returning id into payment_id;
  perform public.refresh_invoice_balance_state(invoice_record.id);
  insert into public.activities(actor_id, project_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), invoice_record.project_id, 'payment_recorded', 'receipt', payment_id::text,
    jsonb_build_object('invoice_id', invoice_record.id, 'amount', target_amount, 'receipt_number', receipt));
  return payment_id;
end;
$$;

create or replace function public.void_invoice_payment(target_payment_id uuid, target_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_record public.invoice_payments;
  invoice_project uuid;
begin
  if not public.has_role(array['owner', 'finance']) then raise exception 'Billing permission is required'; end if;
  if nullif(trim(coalesce(target_reason, '')), '') is null then raise exception 'Add a reason for voiding this payment'; end if;
  update public.invoice_payments
  set status = 'void', voided_at = timezone('utc', now()), voided_by = auth.uid(),
      void_reason = trim(target_reason), updated_at = timezone('utc', now())
  where id = target_payment_id and status = 'recorded'
  returning * into payment_record;
  if payment_record.id is null then raise exception 'This payment cannot be voided'; end if;
  select project_id into invoice_project from public.invoices where id = payment_record.invoice_id;
  perform public.refresh_invoice_balance_state(payment_record.invoice_id);
  insert into public.activities(actor_id, project_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), invoice_project, 'voided', 'receipt', payment_record.id::text,
    jsonb_build_object('reason', trim(target_reason), 'invoice_id', payment_record.invoice_id));
end;
$$;

create or replace function public.save_invoice_adjustment_draft(
  target_adjustment_id uuid,
  target_invoice_id uuid,
  target_kind text,
  target_reason text,
  target_vat_rate numeric,
  target_notes text,
  target_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  adjustment_id uuid;
  calculated_subtotal numeric(14,2);
begin
  if not public.has_role(array['owner', 'finance']) then raise exception 'Billing permission is required'; end if;
  if target_kind not in ('debit', 'credit') then raise exception 'Choose debit or credit note'; end if;
  if nullif(trim(coalesce(target_reason, '')), '') is null then raise exception 'Add a reason for this note'; end if;
  if not exists (select 1 from public.invoices where id = target_invoice_id and status not in ('draft', 'void')) then
    raise exception 'Choose a finalized invoice';
  end if;
  if jsonb_typeof(target_items) <> 'array' or jsonb_array_length(target_items) = 0 then raise exception 'Add at least one item'; end if;
  select coalesce(sum(greatest((item->>'quantity')::numeric, 0) * greatest((item->>'unit_price')::numeric, 0)), 0)
  into calculated_subtotal from jsonb_array_elements(target_items) item;
  if target_adjustment_id is null then
    insert into public.invoice_adjustments(invoice_id, kind, reason, notes, subtotal, vat_rate, tax, created_by)
    values (target_invoice_id, target_kind, trim(target_reason), nullif(trim(coalesce(target_notes, '')), ''),
      calculated_subtotal, greatest(coalesce(target_vat_rate, 0), 0),
      round(calculated_subtotal * greatest(coalesce(target_vat_rate, 0), 0) / 100, 2), auth.uid())
    returning id into adjustment_id;
  else
    update public.invoice_adjustments
    set reason = trim(target_reason), notes = nullif(trim(coalesce(target_notes, '')), ''),
        subtotal = calculated_subtotal, vat_rate = greatest(coalesce(target_vat_rate, 0), 0),
        tax = round(calculated_subtotal * greatest(coalesce(target_vat_rate, 0), 0) / 100, 2),
        updated_at = timezone('utc', now())
    where id = target_adjustment_id and invoice_id = target_invoice_id and kind = target_kind and status = 'draft'
    returning id into adjustment_id;
    if adjustment_id is null then raise exception 'Only a draft note can be edited'; end if;
    delete from public.invoice_adjustment_items existing_item
    where existing_item.adjustment_id = target_adjustment_id;
  end if;
  insert into public.invoice_adjustment_items(adjustment_id, description, quantity, unit_price, position)
  select adjustment_id, trim(item->>'description'), greatest((item->>'quantity')::numeric, .01),
    greatest((item->>'unit_price')::numeric, 0), ordinality - 1
  from jsonb_array_elements(target_items) with ordinality rows(item, ordinality)
  where trim(coalesce(item->>'description', '')) <> '';
  if not exists (
    select 1 from public.invoice_adjustment_items saved_item
    where saved_item.adjustment_id = adjustment_id
  ) then
    raise exception 'Add a described line item';
  end if;
  return adjustment_id;
end;
$$;

create or replace function public.issue_invoice_adjustment(target_adjustment_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  adjustment_record public.invoice_adjustments;
  invoice_record public.invoices;
  balance_record record;
  number_value text;
  snapshot_value jsonb;
begin
  if not public.has_role(array['owner', 'finance']) then raise exception 'Billing permission is required'; end if;
  select * into adjustment_record from public.invoice_adjustments where id = target_adjustment_id for update;
  if adjustment_record.id is null or adjustment_record.status <> 'draft' then raise exception 'Only a draft note can be issued'; end if;
  select * into invoice_record from public.invoices where id = adjustment_record.invoice_id for update;
  select * into balance_record from public.get_invoice_balance(invoice_record.id);
  if adjustment_record.kind = 'credit'
    and balance_record.adjusted_total - adjustment_record.total < balance_record.paid_amount then
    raise exception 'This credit would reduce the invoice below the amount already paid';
  end if;
  number_value := public.next_billing_document_number(adjustment_record.kind, timezone('utc', now()));
  snapshot_value := jsonb_build_object(
    'invoice_snapshot', coalesce(invoice_record.document_snapshot, public.invoice_snapshot(invoice_record.id)),
    'note', to_jsonb(adjustment_record) || jsonb_build_object('note_number', number_value),
    'items', (select coalesce(jsonb_agg(to_jsonb(item) order by item.position), '[]'::jsonb)
      from public.invoice_adjustment_items item where item.adjustment_id = adjustment_record.id),
    'balance_before', balance_record.adjusted_total,
    'balance_after', balance_record.adjusted_total + case when adjustment_record.kind = 'debit' then adjustment_record.total else -adjustment_record.total end
  );
  update public.invoice_adjustments
  set note_number = number_value, status = 'issued', issued_at = timezone('utc', now()),
      document_snapshot = snapshot_value, updated_at = timezone('utc', now())
  where id = adjustment_record.id;
  perform public.refresh_invoice_balance_state(invoice_record.id);
  insert into public.activities(actor_id, project_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), invoice_record.project_id, 'issued', adjustment_record.kind || '_note',
    adjustment_record.id::text, jsonb_build_object('invoice_id', invoice_record.id, 'note_number', number_value));
  return number_value;
end;
$$;

create or replace function public.void_invoice_adjustment(target_adjustment_id uuid, target_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  adjustment_record public.invoice_adjustments;
  invoice_project uuid;
begin
  if not public.has_role(array['owner', 'finance']) then raise exception 'Billing permission is required'; end if;
  if nullif(trim(coalesce(target_reason, '')), '') is null then raise exception 'Add a reason for voiding this note'; end if;
  update public.invoice_adjustments
  set status = 'void', voided_at = timezone('utc', now()), voided_by = auth.uid(),
      void_reason = trim(target_reason), updated_at = timezone('utc', now())
  where id = target_adjustment_id and status = 'issued'
  returning * into adjustment_record;
  if adjustment_record.id is null then raise exception 'Only an issued note can be voided'; end if;
  select project_id into invoice_project from public.invoices where id = adjustment_record.invoice_id;
  perform public.refresh_invoice_balance_state(adjustment_record.invoice_id);
  insert into public.activities(actor_id, project_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), invoice_project, 'voided', adjustment_record.kind || '_note', adjustment_record.id::text,
    jsonb_build_object('reason', trim(target_reason), 'invoice_id', adjustment_record.invoice_id));
end;
$$;

-- Preserve existing paid invoices as auditable payment records.
with legacy as (
  select invoice.*,
    row_number() over (partition by extract(year from coalesce(invoice.paid_at, invoice.updated_at))
      order by coalesce(invoice.paid_at, invoice.updated_at), invoice.id) as sequence
  from public.invoices invoice
  where invoice.status = 'paid'
    and not exists (select 1 from public.invoice_payments payment where payment.invoice_id = invoice.id)
)
insert into public.invoice_payments(
  invoice_id, receipt_number, amount, currency, paid_at, method, reference,
  notes, status, document_snapshot, created_by
)
select id,
  'RCP-' || extract(year from coalesce(paid_at, updated_at))::integer || '-L' || lpad(sequence::text, 3, '0'),
  total, currency, coalesce(paid_at, updated_at), 'Legacy payment',
  payment_reference, 'Backfilled from the previous paid invoice status.', 'recorded',
  jsonb_build_object('invoice_snapshot', coalesce(document_snapshot, public.invoice_snapshot(id)),
    'legacy', true, 'amount', total, 'balance_after', 0),
  created_by
from legacy;

update public.invoices invoice
set document_snapshot = public.invoice_snapshot(invoice.id)
where invoice.status <> 'draft' and invoice.document_snapshot is null;

create or replace function public.get_crm_dashboard(months_back integer default 12)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  start_month date := date_trunc('month', current_date)::date - (greatest(months_back, 1) - 1) * interval '1 month';
begin
  if not public.is_internal_user() then raise exception 'Workspace access is required'; end if;
  return jsonb_build_object(
    'monthly', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'month', month_start,
        'clients', (select count(distinct project.client_id) from public.projects project
          where coalesce(project.start_date, project.created_at::date) < month_start + interval '1 month'
            and coalesce(project.due_date, current_date) >= month_start),
        'revenue', (select coalesce(jsonb_object_agg(currency, total), '{}'::jsonb) from (
          select payment.currency, sum(payment.amount)::numeric total
          from public.invoice_payments payment
          where payment.status = 'recorded' and payment.paid_at >= month_start
            and payment.paid_at < month_start + interval '1 month'
          group by payment.currency
        ) paid)
      ) order by month_start), '[]'::jsonb)
      from generate_series(start_month, date_trunc('month', current_date)::date, interval '1 month') month_start
    ),
    'active_clients', (select count(distinct client_id) from public.projects where archived_at is null and status = 'active'),
    'worked_this_month', (select count(distinct client_id) from public.projects
      where coalesce(start_date, created_at::date) < date_trunc('month', current_date) + interval '1 month'
        and coalesce(due_date, current_date) >= date_trunc('month', current_date)),
    'paid_this_month', (select coalesce(jsonb_object_agg(currency, total), '{}'::jsonb) from (
      select currency, sum(amount)::numeric total from public.invoice_payments
      where status = 'recorded' and paid_at >= date_trunc('month', current_date)
        and paid_at < date_trunc('month', current_date) + interval '1 month'
      group by currency
    ) paid),
    'outstanding', (select coalesce(jsonb_object_agg(currency, total), '{}'::jsonb) from (
      select invoice.currency, sum(balance.outstanding_balance)::numeric total
      from public.invoices invoice
      cross join lateral public.get_invoice_balance(invoice.id) balance
      where invoice.status not in ('draft', 'void') and balance.outstanding_balance > 0
      group by invoice.currency
    ) due)
  );
end;
$$;

alter table public.billing_settings enable row level security;
alter table public.billing_document_sequences enable row level security;
alter table public.invoice_payments enable row level security;
alter table public.invoice_adjustments enable row level security;
alter table public.invoice_adjustment_items enable row level security;

create policy "billing settings internal read" on public.billing_settings for select using (public.is_internal_user());
create policy "billing settings finance update" on public.billing_settings for update
  using (public.has_role(array['owner', 'finance'])) with check (public.has_role(array['owner', 'finance']));

create policy "payments visible with invoice" on public.invoice_payments for select using (
  exists (select 1 from public.invoices invoice where invoice.id = invoice_payments.invoice_id
    and (public.is_internal_user() or (invoice.project_id is not null and public.can_access_project(invoice.project_id))))
);
create policy "adjustments visible with invoice" on public.invoice_adjustments for select using (
  exists (select 1 from public.invoices invoice where invoice.id = invoice_adjustments.invoice_id
    and (public.is_internal_user() or (invoice.project_id is not null and public.can_access_project(invoice.project_id))))
);
create policy "adjustment items visible with note" on public.invoice_adjustment_items for select using (
  exists (select 1 from public.invoice_adjustments adjustment
    join public.invoices invoice on invoice.id = adjustment.invoice_id
    where adjustment.id = invoice_adjustment_items.adjustment_id
      and (public.is_internal_user() or (invoice.project_id is not null and public.can_access_project(invoice.project_id))))
);
create policy "finance manage payments" on public.invoice_payments for all
  using (public.has_role(array['owner', 'finance'])) with check (public.has_role(array['owner', 'finance']));
create policy "finance manage adjustments" on public.invoice_adjustments for all
  using (public.has_role(array['owner', 'finance'])) with check (public.has_role(array['owner', 'finance']));
create policy "finance manage adjustment items" on public.invoice_adjustment_items for all
  using (public.has_role(array['owner', 'finance'])) with check (public.has_role(array['owner', 'finance']));

revoke all on function public.next_billing_document_number(text, timestamptz) from public;
revoke all on function public.invoice_snapshot(uuid) from public;
revoke all on function public.refresh_invoice_balance_state(uuid) from public;
revoke all on function public.record_invoice_payment(uuid, numeric, timestamptz, text, text, text) from public;
revoke all on function public.void_invoice_payment(uuid, text) from public;
revoke all on function public.save_invoice_adjustment_draft(uuid, uuid, text, text, numeric, text, jsonb) from public;
revoke all on function public.issue_invoice_adjustment(uuid) from public;
revoke all on function public.void_invoice_adjustment(uuid, text) from public;
grant execute on function public.get_invoice_balance(uuid) to authenticated;
grant execute on function public.get_crm_dashboard(integer) to authenticated;
grant execute on function public.record_invoice_payment(uuid, numeric, timestamptz, text, text, text) to authenticated;
grant execute on function public.void_invoice_payment(uuid, text) to authenticated;
grant execute on function public.save_invoice_adjustment_draft(uuid, uuid, text, text, numeric, text, jsonb) to authenticated;
grant execute on function public.issue_invoice_adjustment(uuid) to authenticated;
grant execute on function public.void_invoice_adjustment(uuid, text) to authenticated;

commit;
