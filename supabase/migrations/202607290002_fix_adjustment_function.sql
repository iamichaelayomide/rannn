begin;

do $repair$
declare
  definition text;
begin
  select pg_get_functiondef(
    'public.save_invoice_adjustment_draft(uuid,uuid,text,text,numeric,text,jsonb)'::regprocedure
  ) into definition;
  definition := replace(
    definition,
    'delete from public.invoice_adjustment_items where adjustment_id = target_adjustment_id;',
    'delete from public.invoice_adjustment_items existing_item where existing_item.adjustment_id = target_adjustment_id;'
  );
  execute definition;
end;
$repair$;

commit;
