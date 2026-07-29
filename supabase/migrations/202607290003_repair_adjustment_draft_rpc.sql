begin;

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
  saved_adjustment_id uuid;
  calculated_subtotal numeric(14,2);
begin
  if not public.has_role(array['owner', 'finance']) then
    raise exception 'Billing permission is required';
  end if;
  if target_kind not in ('debit', 'credit') then
    raise exception 'Choose debit or credit note';
  end if;
  if nullif(trim(coalesce(target_reason, '')), '') is null then
    raise exception 'Add a reason for this note';
  end if;
  if not exists (
    select 1 from public.invoices invoice
    where invoice.id = target_invoice_id and invoice.status not in ('draft', 'void')
  ) then
    raise exception 'Choose a finalized invoice';
  end if;
  if jsonb_typeof(target_items) <> 'array' or jsonb_array_length(target_items) = 0 then
    raise exception 'Add at least one item';
  end if;

  select coalesce(sum(
    greatest((item->>'quantity')::numeric, 0)
    * greatest((item->>'unit_price')::numeric, 0)
  ), 0)
  into calculated_subtotal
  from jsonb_array_elements(target_items) item;

  if target_adjustment_id is null then
    insert into public.invoice_adjustments(
      invoice_id, kind, reason, notes, subtotal, vat_rate, tax, created_by
    )
    values (
      target_invoice_id, target_kind, trim(target_reason),
      nullif(trim(coalesce(target_notes, '')), ''), calculated_subtotal,
      greatest(coalesce(target_vat_rate, 0), 0),
      round(calculated_subtotal * greatest(coalesce(target_vat_rate, 0), 0) / 100, 2),
      auth.uid()
    )
    returning id into saved_adjustment_id;
  else
    update public.invoice_adjustments adjustment
    set reason = trim(target_reason),
        notes = nullif(trim(coalesce(target_notes, '')), ''),
        subtotal = calculated_subtotal,
        vat_rate = greatest(coalesce(target_vat_rate, 0), 0),
        tax = round(calculated_subtotal * greatest(coalesce(target_vat_rate, 0), 0) / 100, 2),
        updated_at = timezone('utc', now())
    where adjustment.id = target_adjustment_id
      and adjustment.invoice_id = target_invoice_id
      and adjustment.kind = target_kind
      and adjustment.status = 'draft'
    returning adjustment.id into saved_adjustment_id;
    if saved_adjustment_id is null then
      raise exception 'Only a draft note can be edited';
    end if;
    delete from public.invoice_adjustment_items existing_item
    where existing_item.adjustment_id = target_adjustment_id;
  end if;

  insert into public.invoice_adjustment_items(
    adjustment_id, description, quantity, unit_price, position
  )
  select saved_adjustment_id, trim(item->>'description'),
    greatest((item->>'quantity')::numeric, .01),
    greatest((item->>'unit_price')::numeric, 0), ordinality - 1
  from jsonb_array_elements(target_items) with ordinality rows(item, ordinality)
  where trim(coalesce(item->>'description', '')) <> '';

  if not exists (
    select 1 from public.invoice_adjustment_items saved_item
    where saved_item.adjustment_id = saved_adjustment_id
  ) then
    raise exception 'Add a described line item';
  end if;
  return saved_adjustment_id;
end;
$$;

commit;
