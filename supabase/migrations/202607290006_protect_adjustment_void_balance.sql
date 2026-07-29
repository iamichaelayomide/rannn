begin;

create or replace function public.void_invoice_adjustment(target_adjustment_id uuid, target_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  adjustment_record public.invoice_adjustments;
  invoice_project uuid;
  balance_record record;
begin
  if not public.has_role(array['owner', 'finance']) then
    raise exception 'Billing permission is required';
  end if;
  if nullif(trim(coalesce(target_reason, '')), '') is null then
    raise exception 'Add a reason for voiding this note';
  end if;

  select * into adjustment_record
  from public.invoice_adjustments adjustment
  where adjustment.id = target_adjustment_id and adjustment.status = 'issued'
  for update;
  if adjustment_record.id is null then
    raise exception 'Only an issued note can be voided';
  end if;

  select * into balance_record
  from public.get_invoice_balance(adjustment_record.invoice_id);
  if adjustment_record.kind = 'debit'
    and balance_record.adjusted_total - adjustment_record.total < balance_record.paid_amount then
    raise exception 'This debit note cannot be voided because payments exceed the resulting invoice total';
  end if;

  update public.invoice_adjustments
  set status = 'void', voided_at = timezone('utc', now()), voided_by = auth.uid(),
      void_reason = trim(target_reason), updated_at = timezone('utc', now())
  where id = adjustment_record.id;
  select project_id into invoice_project
  from public.invoices where id = adjustment_record.invoice_id;
  perform public.refresh_invoice_balance_state(adjustment_record.invoice_id);
  insert into public.activities(actor_id, project_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), invoice_project, 'voided', adjustment_record.kind || '_note',
    adjustment_record.id::text,
    jsonb_build_object('reason', trim(target_reason), 'invoice_id', adjustment_record.invoice_id)
  );
end;
$$;

commit;
