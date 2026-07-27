begin;

create or replace function public.protect_archived_project_record()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.archived_at is not null then
    if tg_op = 'DELETE' then
      raise exception 'Restore this project before deleting it';
    end if;
    if (to_jsonb(new) - 'archived_at' - 'updated_at')
        is distinct from
       (to_jsonb(old) - 'archived_at' - 'updated_at') then
      raise exception 'Restore this project before editing it';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists protect_archived_project_record on public.projects;
create trigger protect_archived_project_record
before update or delete on public.projects
for each row execute function public.protect_archived_project_record();

create or replace function public.protect_archived_project_child()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  related_project_id uuid;
begin
  related_project_id := case when tg_op = 'DELETE' then old.project_id else new.project_id end;
  if exists (
    select 1 from public.projects
    where id = related_project_id and archived_at is not null
  ) then
    raise exception 'Restore this project before changing its records';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists protect_archived_milestone on public.milestones;
create trigger protect_archived_milestone
before insert or update or delete on public.milestones
for each row execute function public.protect_archived_project_child();

drop trigger if exists protect_archived_invoice on public.invoices;
create trigger protect_archived_invoice
before insert or update or delete on public.invoices
for each row execute function public.protect_archived_project_child();

drop trigger if exists protect_archived_invite on public.project_invites;
create trigger protect_archived_invite
before insert or update or delete on public.project_invites
for each row execute function public.protect_archived_project_child();

drop trigger if exists protect_archived_member on public.project_members;
create trigger protect_archived_member
before insert or update or delete on public.project_members
for each row execute function public.protect_archived_project_child();

create or replace function public.protect_archived_deliverable()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  related_milestone_id uuid;
begin
  related_milestone_id := case when tg_op = 'DELETE' then old.milestone_id else new.milestone_id end;
  if exists (
    select 1
    from public.milestones milestone
    join public.projects project on project.id = milestone.project_id
    where milestone.id = related_milestone_id
      and project.archived_at is not null
  ) then
    raise exception 'Restore this project before changing its deliverables';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists protect_archived_deliverable on public.deliverables;
create trigger protect_archived_deliverable
before insert or update or delete on public.deliverables
for each row execute function public.protect_archived_deliverable();

create or replace function public.protect_archived_invoice_item()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  related_invoice_id uuid;
begin
  related_invoice_id := case when tg_op = 'DELETE' then old.invoice_id else new.invoice_id end;
  if exists (
    select 1
    from public.invoices invoice
    join public.projects project on project.id = invoice.project_id
    where invoice.id = related_invoice_id
      and project.archived_at is not null
  ) then
    raise exception 'Restore this project before changing its invoice items';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists protect_archived_invoice_item on public.invoice_items;
create trigger protect_archived_invoice_item
before insert or update or delete on public.invoice_items
for each row execute function public.protect_archived_invoice_item();

commit;
