begin;

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
  values (
    auth.uid(), changed.project_id, target_status, 'invoice', changed.id::text,
    jsonb_strip_nulls(jsonb_build_object('legacy_reference', target_payment_reference))
  );
  return changed;
end;
$$;

commit;
