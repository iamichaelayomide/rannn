begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'client'
    check (role in ('owner', 'content_manager', 'project_manager', 'finance', 'contributor', 'client')),
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_internal_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in
    ('owner', 'content_manager', 'project_manager', 'finance', 'contributor'), false);
$$;

create or replace function public.has_role(allowed text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = any(allowed), false);
$$;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
    and not public.has_role(array['owner']) then
    raise exception 'Only an owner can change account roles';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
before update on public.profiles
for each row execute function public.protect_profile_role();

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  company text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.intake_submissions (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'project' check (kind in ('event', 'project', 'contact')),
  name text not null,
  email text not null,
  phone text,
  title text,
  service text,
  budget text,
  timeline text,
  message text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'converted', 'archived')),
  converted_project_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  intake_submission_id uuid references public.intake_submissions(id) on delete set null,
  title text not null,
  code text unique,
  description text,
  service text,
  budget numeric(14,2),
  currency text not null default 'NGN',
  start_date date,
  due_date date,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'on_hold', 'completed', 'cancelled')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.intake_submissions
  drop constraint if exists intake_submissions_converted_project_id_fkey;
alter table public.intake_submissions
  add constraint intake_submissions_converted_project_id_fkey
  foreign key (converted_project_id) references public.projects(id) on delete set null;

create or replace function public.mark_intake_converted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.intake_submission_id is not null then
    update public.intake_submissions
    set status = 'converted', converted_project_id = new.id
    where id = new.intake_submission_id;
  end if;
  return new;
end;
$$;

drop trigger if exists mark_intake_converted on public.projects;
create trigger mark_intake_converted
after insert on public.projects
for each row execute function public.mark_intake_converted();

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'viewer'
    check (member_role in ('manager', 'contributor', 'client', 'viewer')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (project_id, user_id)
);

create table if not exists public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null,
  token uuid not null default gen_random_uuid() unique,
  expires_at timestamptz not null default (timezone('utc', now()) + interval '7 days'),
  accepted_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.can_access_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_internal_user()
    or exists (
      select 1 from public.project_members
      where project_id = target_project_id and user_id = auth.uid()
    );
$$;

create or replace function public.claim_project_invite(invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_invite public.project_invites%rowtype;
  user_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;
  user_email := auth.jwt() ->> 'email';
  select * into matched_invite
  from public.project_invites
  where token = invite_token
    and lower(email) = lower(user_email)
    and accepted_at is null
    and expires_at > timezone('utc', now())
  for update;
  if matched_invite.id is null then
    raise exception 'This invitation is invalid, expired, or belongs to another email address';
  end if;
  insert into public.project_members (project_id, user_id, member_role)
  values (matched_invite.project_id, auth.uid(), 'client')
  on conflict (project_id, user_id) do update set member_role = 'client';
  update public.project_invites
  set accepted_at = timezone('utc', now())
  where id = matched_invite.id;
  return matched_invite.project_id;
end;
$$;

revoke all on function public.claim_project_invite(uuid) from public;
grant execute on function public.claim_project_invite(uuid) to authenticated;

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  position integer not null default 0,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'awaiting_approval', 'changes_requested', 'approved', 'completed')),
  requires_approval boolean not null default true,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.deliverables (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  title text not null,
  description text,
  file_url text not null,
  version integer not null default 1 check (version > 0),
  status text not null default 'shared'
    check (status in ('draft', 'shared', 'approved', 'changes_requested', 'archived')),
  client_note text,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (milestone_id, title, version)
);

create or replace function public.protect_client_milestone_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_app_role() = 'client' then
    if new.project_id is distinct from old.project_id
      or new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.due_date is distinct from old.due_date
      or new.position is distinct from old.position
      or new.requires_approval is distinct from old.requires_approval then
      raise exception 'Clients can only approve a milestone or request changes';
    end if;
    if new.status not in ('approved', 'changes_requested') then
      raise exception 'Invalid client milestone status';
    end if;
    new.approved_by = case when new.status = 'approved' then auth.uid() else null end;
    new.approved_at = case when new.status = 'approved' then timezone('utc', now()) else null end;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_client_milestone_update on public.milestones;
create trigger protect_client_milestone_update
before update on public.milestones
for each row execute function public.protect_client_milestone_update();

create or replace function public.protect_client_deliverable_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_app_role() = 'client' then
    if new.milestone_id is distinct from old.milestone_id
      or new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.file_url is distinct from old.file_url
      or new.version is distinct from old.version
      or new.uploaded_by is distinct from old.uploaded_by then
      raise exception 'Clients can only review a deliverable';
    end if;
    if new.status not in ('approved', 'changes_requested') then
      raise exception 'Invalid client deliverable status';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_client_deliverable_update on public.deliverables;
create trigger protect_client_deliverable_update
before update on public.deliverables
for each row execute function public.protect_client_deliverable_update();

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  invoice_number text not null unique,
  status text not null default 'draft'
    check (status in ('draft', 'open', 'paid', 'void', 'uncollectible')),
  currency text not null default 'NGN',
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  tax numeric(14,2) not null default 0 check (tax >= 0),
  total numeric(14,2) generated always as (subtotal + tax) stored,
  due_date date,
  issued_at timestamptz,
  paid_at timestamptz,
  payment_reference text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

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

drop trigger if exists enforce_invoice_lifecycle on public.invoices;
create trigger enforce_invoice_lifecycle
before update on public.invoices
for each row execute function public.enforce_invoice_lifecycle();

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  content jsonb not null default '{}'::jsonb,
  seo_title text,
  seo_description text,
  published_at timestamptz,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text,
  description text,
  image_url text,
  position integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  public_url text,
  internal_name text not null,
  alt_text text not null default '',
  caption text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  archived_at timestamptz,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.activities (
  id bigint generated by default as identity primary key,
  actor_id uuid references public.profiles(id),
  project_id uuid references public.projects(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists projects_client_id_idx on public.projects(client_id);
create index if not exists projects_status_idx on public.projects(status);
create index if not exists project_members_user_id_idx on public.project_members(user_id);
create index if not exists milestones_project_id_idx on public.milestones(project_id);
create index if not exists invoices_project_id_idx on public.invoices(project_id);
create index if not exists invoices_status_idx on public.invoices(status);
create index if not exists intake_status_idx on public.intake_submissions(status);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'clients', 'intake_submissions', 'projects', 'milestones',
    'deliverables', 'invoices', 'pages', 'services', 'media_assets'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name, table_name
    );
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.intake_submissions enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invites enable row level security;
alter table public.milestones enable row level security;
alter table public.deliverables enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.pages enable row level security;
alter table public.services enable row level security;
alter table public.media_assets enable row level security;
alter table public.activities enable row level security;

create policy "profiles read own or internal" on public.profiles
for select using (id = auth.uid() or public.is_internal_user());
create policy "profiles update own" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());
create policy "owners manage profiles" on public.profiles
for update using (public.has_role(array['owner'])) with check (public.has_role(array['owner']));

create policy "internal manage clients" on public.clients
for all using (public.is_internal_user()) with check (public.is_internal_user());
create policy "clients read linked record" on public.clients
for select using (
  exists (
    select 1 from public.projects p
    join public.project_members pm on pm.project_id = p.id
    where p.client_id = clients.id and pm.user_id = auth.uid()
  )
);

create policy "public create intake" on public.intake_submissions
for insert to anon, authenticated with check (
  status = 'new'
  and converted_project_id is null
);
create policy "internal manage intake" on public.intake_submissions
for all using (public.is_internal_user()) with check (public.is_internal_user());

create policy "project access" on public.projects
for select using (public.can_access_project(id));
create policy "project managers create projects" on public.projects
for insert with check (public.has_role(array['owner', 'project_manager']));
create policy "project managers update projects" on public.projects
for update using (public.has_role(array['owner', 'project_manager']))
with check (public.has_role(array['owner', 'project_manager']));
create policy "owners delete draft projects" on public.projects
for delete using (public.has_role(array['owner']) and status = 'draft');

create policy "project members visible to project" on public.project_members
for select using (public.can_access_project(project_id));
create policy "project managers manage members" on public.project_members
for all using (public.has_role(array['owner', 'project_manager']))
with check (public.has_role(array['owner', 'project_manager']));

create policy "project managers manage invites" on public.project_invites
for all using (public.has_role(array['owner', 'project_manager']))
with check (public.has_role(array['owner', 'project_manager']));

create policy "milestones visible to project" on public.milestones
for select using (public.can_access_project(project_id));
create policy "internal manage milestones" on public.milestones
for all using (public.is_internal_user()) with check (public.is_internal_user());
create policy "clients approve milestones" on public.milestones
for update using (
  public.current_app_role() = 'client'
  and public.can_access_project(project_id)
  and status in ('awaiting_approval', 'changes_requested', 'approved')
) with check (
  public.current_app_role() = 'client'
  and public.can_access_project(project_id)
  and status in ('approved', 'changes_requested')
);

create policy "deliverables visible through milestone" on public.deliverables
for select using (
  exists (
    select 1 from public.milestones m
    where m.id = deliverables.milestone_id and public.can_access_project(m.project_id)
  )
);
create policy "internal manage deliverables" on public.deliverables
for all using (public.is_internal_user()) with check (public.is_internal_user());
create policy "clients review deliverables" on public.deliverables
for update using (
  public.current_app_role() = 'client'
  and exists (
    select 1 from public.milestones m
    where m.id = deliverables.milestone_id and public.can_access_project(m.project_id)
  )
) with check (status in ('approved', 'changes_requested'));

create policy "invoices visible to project" on public.invoices
for select using (public.can_access_project(project_id));
create policy "finance create invoices" on public.invoices
for insert with check (public.has_role(array['owner', 'finance']));
create policy "finance update invoices" on public.invoices
for update using (public.has_role(array['owner', 'finance']))
with check (public.has_role(array['owner', 'finance']));
create policy "finance delete draft invoices" on public.invoices
for delete using (public.has_role(array['owner', 'finance']) and status = 'draft');

create policy "invoice items visible with invoice" on public.invoice_items
for select using (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id and public.can_access_project(i.project_id)
  )
);
create policy "finance manage invoice items" on public.invoice_items
for all using (public.has_role(array['owner', 'finance']))
with check (public.has_role(array['owner', 'finance']));

create policy "published pages are public" on public.pages
for select to anon, authenticated using (status = 'published' or public.is_internal_user());
create policy "content roles manage pages" on public.pages
for all using (public.has_role(array['owner', 'content_manager']))
with check (public.has_role(array['owner', 'content_manager']));

create policy "published services are public" on public.services
for select to anon, authenticated using (status = 'published' or public.is_internal_user());
create policy "content roles manage services" on public.services
for all using (public.has_role(array['owner', 'content_manager']))
with check (public.has_role(array['owner', 'content_manager']));

create policy "media visible to internal users" on public.media_assets
for select using (public.is_internal_user());
create policy "content roles manage media" on public.media_assets
for all using (public.has_role(array['owner', 'content_manager']))
with check (public.has_role(array['owner', 'content_manager']));

create policy "activities visible to related users" on public.activities
for select using (
  public.is_internal_user()
  or (project_id is not null and public.can_access_project(project_id))
);
create policy "authenticated users create activity" on public.activities
for insert to authenticated with check (
  actor_id = auth.uid()
  and (project_id is null or public.can_access_project(project_id))
);

grant usage on schema public to anon, authenticated;
grant select on public.pages, public.services to anon;
grant insert on public.intake_submissions to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media',
  'site-media',
  true,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "site media is publicly readable" on storage.objects
for select to anon, authenticated using (bucket_id = 'site-media');
create policy "content roles upload site media" on storage.objects
for insert to authenticated with check (
  bucket_id = 'site-media'
  and public.has_role(array['owner', 'content_manager'])
);
create policy "content roles update site media" on storage.objects
for update to authenticated using (
  bucket_id = 'site-media'
  and public.has_role(array['owner', 'content_manager'])
) with check (
  bucket_id = 'site-media'
  and public.has_role(array['owner', 'content_manager'])
);
create policy "content roles delete site media" on storage.objects
for delete to authenticated using (
  bucket_id = 'site-media'
  and public.has_role(array['owner', 'content_manager'])
);

insert into public.pages (slug, title, status, content)
values
  ('home', 'Home', 'draft', '{"hero":{"eyebrow":"Premium Media House","title_line_one":"Let''s Create","title_line_two":"The Future","body":"We direct, capture, edit, and design visual stories.","background_image":null}}'::jsonb),
  ('about', 'About', 'draft', '{}'::jsonb),
  ('contact', 'Contact', 'draft', '{}'::jsonb)
on conflict (slug) do nothing;

commit;
