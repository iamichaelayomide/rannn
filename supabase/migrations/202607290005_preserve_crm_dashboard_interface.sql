begin;

create or replace function public.get_crm_dashboard(months_back integer default 12)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  start_month date := date_trunc('month', current_date)::date - (greatest(months_back, 1) - 1) * interval '1 month';
  current_month date := date_trunc('month', current_date)::date;
begin
  if not public.is_internal_user() then raise exception 'Workspace access is required'; end if;
  return jsonb_build_object(
    'months', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'month', to_char(month_start, 'YYYY-MM-DD'),
        'clientsWorked', (
          select count(distinct project.client_id)
          from public.projects project
          where coalesce(project.start_date, project.created_at::date) < month_start + interval '1 month'
            and coalesce(project.due_date, current_date) >= month_start
        ),
        'revenue', (
          select coalesce(jsonb_agg(jsonb_build_object('currency', currency, 'total', total) order by currency), '[]'::jsonb)
          from (
            select payment.currency, sum(payment.amount)::numeric total
            from public.invoice_payments payment
            where payment.status = 'recorded'
              and payment.paid_at >= month_start
              and payment.paid_at < month_start + interval '1 month'
            group by payment.currency
          ) paid
        )
      ) order by month_start), '[]'::jsonb)
      from generate_series(start_month, current_month, interval '1 month') month_start
    ),
    'activeClients', (
      select count(distinct project.client_id)
      from public.projects project
      where project.archived_at is null and project.status = 'active'
    ),
    'clientsWorkedThisMonth', (
      select count(distinct project.client_id)
      from public.projects project
      where coalesce(project.start_date, project.created_at::date) < current_month + interval '1 month'
        and coalesce(project.due_date, current_date) >= current_month
    ),
    'newClientsThisMonth', (
      select count(*) from public.clients client
      where client.created_at >= current_month
        and client.created_at < current_month + interval '1 month'
    ),
    'paidThisMonth', (
      select coalesce(jsonb_agg(jsonb_build_object('currency', currency, 'total', total) order by currency), '[]'::jsonb)
      from (
        select payment.currency, sum(payment.amount)::numeric total
        from public.invoice_payments payment
        where payment.status = 'recorded'
          and payment.paid_at >= current_month
          and payment.paid_at < current_month + interval '1 month'
        group by payment.currency
      ) paid
    ),
    'outstanding', (
      select coalesce(jsonb_agg(jsonb_build_object('currency', currency, 'total', total) order by currency), '[]'::jsonb)
      from (
        select invoice.currency, sum(balance.outstanding_balance)::numeric total
        from public.invoices invoice
        cross join lateral public.get_invoice_balance(invoice.id) balance
        where invoice.status not in ('draft', 'void') and balance.outstanding_balance > 0
        group by invoice.currency
      ) due
    )
  );
end;
$$;

commit;
