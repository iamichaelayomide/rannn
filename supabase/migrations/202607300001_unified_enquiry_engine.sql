begin;

alter table public.intake_submissions
  alter column email drop not null;

alter table public.intake_submissions
  drop constraint if exists intake_submissions_status_check;

update public.intake_submissions
set status = case status
  when 'reviewing' then 'in_review'
  when 'archived' then 'closed'
  else status
end;

alter table public.intake_submissions
  add constraint intake_submissions_status_check
  check (status in ('new', 'in_review', 'waiting_for_client', 'qualified', 'converted', 'closed', 'spam'));

alter table public.intake_submissions
  add column if not exists ticket_number text,
  add column if not exists site_key text not null default 'olympus',
  add column if not exists intent text,
  add column if not exists source_page text,
  add column if not exists source_cta text,
  add column if not exists source_url text,
  add column if not exists referrer text,
  add column if not exists utm jsonb not null default '{}'::jsonb,
  add column if not exists preferred_channel text,
  add column if not exists priority text not null default 'normal',
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null,
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists last_activity_at timestamptz not null default timezone('utc', now()),
  add column if not exists first_responded_at timestamptz,
  add column if not exists consent_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists spam_reason text,
  add column if not exists idempotency_key text;

update public.intake_submissions
set
  intent = coalesce(intent, case kind when 'contact' then 'general' else kind end),
  last_activity_at = coalesce(last_activity_at, updated_at, created_at),
  consent_at = coalesce(consent_at, created_at),
  closed_at = case when status in ('closed', 'spam') then coalesce(closed_at, updated_at, created_at) else null end
where intent is null
   or last_activity_at is null
   or consent_at is null
   or (status in ('closed', 'spam') and closed_at is null);

alter table public.intake_submissions
  alter column intent set not null;

alter table public.intake_submissions
  drop constraint if exists intake_submissions_intent_check;
alter table public.intake_submissions
  add constraint intake_submissions_intent_check
  check (intent in ('general', 'project', 'event'));

alter table public.intake_submissions
  drop constraint if exists intake_submissions_preferred_channel_check;
alter table public.intake_submissions
  add constraint intake_submissions_preferred_channel_check
  check (preferred_channel is null or preferred_channel in ('email', 'whatsapp', 'phone'));

alter table public.intake_submissions
  drop constraint if exists intake_submissions_priority_check;
alter table public.intake_submissions
  add constraint intake_submissions_priority_check
  check (priority in ('normal', 'high', 'urgent'));

create table if not exists public.inquiry_ticket_sequences (
  sequence_year integer primary key,
  last_number integer not null default 0 check (last_number >= 0)
);

with ranked as (
  select
    id,
    extract(year from created_at)::integer as sequence_year,
    row_number() over (
      partition by extract(year from created_at)::integer
      order by created_at, id
    )::integer as sequence_number
  from public.intake_submissions
  where ticket_number is null
)
update public.intake_submissions as inquiry
set ticket_number = format(
  'OLY-INQ-%s-%s',
  ranked.sequence_year,
  lpad(ranked.sequence_number::text, 3, '0')
)
from ranked
where inquiry.id = ranked.id;

insert into public.inquiry_ticket_sequences (sequence_year, last_number)
select
  extract(year from created_at)::integer,
  count(*)::integer
from public.intake_submissions
group by extract(year from created_at)::integer
on conflict (sequence_year) do update
set last_number = greatest(public.inquiry_ticket_sequences.last_number, excluded.last_number);

alter table public.intake_submissions
  alter column ticket_number set not null;

create unique index if not exists intake_ticket_number_key
  on public.intake_submissions(ticket_number);
create unique index if not exists intake_idempotency_key
  on public.intake_submissions(idempotency_key)
  where idempotency_key is not null;
create index if not exists intake_assigned_to_idx
  on public.intake_submissions(assigned_to);
create index if not exists intake_last_activity_idx
  on public.intake_submissions(last_activity_at desc);
create index if not exists intake_intent_idx
  on public.intake_submissions(intent);

create table if not exists public.inquiry_messages (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.intake_submissions(id) on delete cascade,
  channel text not null
    check (channel in ('web', 'email', 'whatsapp', 'phone', 'internal', 'system')),
  direction text not null
    check (direction in ('inbound', 'outbound', 'internal')),
  sender_type text not null default 'contact'
    check (sender_type in ('contact', 'staff', 'system')),
  actor_id uuid references public.profiles(id) on delete set null,
  body text not null check (char_length(body) between 1 and 10000),
  external_message_id text,
  delivery_status text
    check (delivery_status is null or delivery_status in ('pending', 'sent', 'delivered', 'read', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists inquiry_messages_external_id_key
  on public.inquiry_messages(external_message_id)
  where external_message_id is not null;
create index if not exists inquiry_messages_inquiry_created_idx
  on public.inquiry_messages(inquiry_id, created_at);

create table if not exists public.inquiry_events (
  id bigint generated by default as identity primary key,
  inquiry_id uuid not null references public.intake_submissions(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  from_value text,
  to_value text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists inquiry_events_inquiry_created_idx
  on public.inquiry_events(inquiry_id, created_at);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  inquiry_id uuid references public.intake_submissions(id) on delete cascade,
  notification_type text not null default 'new_inquiry',
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists notifications_recipient_unread_idx
  on public.notifications(recipient_id, created_at desc)
  where read_at is null;

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notifications(id) on delete cascade,
  inquiry_id uuid references public.intake_submissions(id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp')),
  recipient text,
  provider text,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  next_attempt_at timestamptz,
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists notification_deliveries_pending_idx
  on public.notification_deliveries(status, next_attempt_at)
  where status in ('pending', 'failed');

create table if not exists public.inquiry_rate_limits (
  fingerprint text not null,
  window_start timestamptz not null,
  attempts integer not null default 1 check (attempts > 0),
  primary key (fingerprint, window_start)
);

create or replace function public.can_manage_inquiries()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_app_role() in ('owner', 'project_manager', 'contributor'),
    false
  );
$$;

create or replace function public.next_inquiry_ticket_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target_year integer := extract(year from timezone('utc', now()))::integer;
  next_number integer;
begin
  insert into public.inquiry_ticket_sequences (sequence_year, last_number)
  values (target_year, 1)
  on conflict (sequence_year) do update
    set last_number = public.inquiry_ticket_sequences.last_number + 1
  returning last_number into next_number;

  return format('OLY-INQ-%s-%s', target_year, lpad(next_number::text, 3, '0'));
end;
$$;

create or replace function public.seed_new_inquiry_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(trim(new.message), '') is not null then
    insert into public.inquiry_messages (
      inquiry_id, channel, direction, sender_type, body, metadata
    )
    values (
      new.id,
      'web',
      'inbound',
      'contact',
      trim(new.message),
      jsonb_build_object('source_page', new.source_page, 'source_cta', new.source_cta)
    );
  end if;

  insert into public.inquiry_events (inquiry_id, event_type, to_value, metadata)
  values (
    new.id,
    'submitted',
    new.status,
    jsonb_build_object('intent', new.intent, 'source_page', new.source_page, 'site_key', new.site_key)
  );

  insert into public.notifications (
    recipient_id, inquiry_id, notification_type, title, body
  )
  select
    profile.id,
    new.id,
    'new_inquiry',
    format('New enquiry from %s', new.name),
    coalesce(new.title, new.service, 'General enquiry')
  from public.profiles as profile
  where profile.role in ('owner', 'project_manager', 'contributor');

  return new;
end;
$$;

drop trigger if exists seed_new_inquiry_activity on public.intake_submissions;
create trigger seed_new_inquiry_activity
after insert on public.intake_submissions
for each row execute function public.seed_new_inquiry_activity();

create or replace function public.create_public_inquiry(
  target_payload jsonb,
  target_fingerprint text
)
returns table (
  inquiry_id uuid,
  ticket_number text,
  created_at timestamptz,
  accepted boolean,
  error_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text := trim(coalesce(target_payload->>'name', ''));
  normalized_email text := nullif(lower(trim(coalesce(target_payload->>'email', ''))), '');
  normalized_phone text := nullif(regexp_replace(coalesce(target_payload->>'phone', ''), '[^0-9+]', '', 'g'), '');
  normalized_message text := trim(coalesce(target_payload->>'message', ''));
  normalized_intent text := coalesce(nullif(target_payload->>'intent', ''), 'general');
  normalized_channel text := nullif(target_payload->>'preferred_channel', '');
  normalized_idempotency text := nullif(target_payload->>'idempotency_key', '');
  normalized_fingerprint text := nullif(trim(coalesce(target_fingerprint, '')), '');
  request_count integer;
  window_bucket timestamptz;
  existing_record record;
  created_record record;
begin
  if normalized_idempotency is not null then
    select id, intake_submissions.ticket_number, intake_submissions.created_at
    into existing_record
    from public.intake_submissions
    where idempotency_key = normalized_idempotency;

    if found then
      return query select
        existing_record.id,
        existing_record.ticket_number,
        existing_record.created_at,
        true,
        null::text;
      return;
    end if;
  end if;

  if char_length(normalized_name) not between 2 and 120
    or char_length(normalized_message) not between 10 and 5000
    or (normalized_email is null and normalized_phone is null)
    or normalized_intent not in ('general', 'project', 'event')
    or coalesce((target_payload->>'consent')::boolean, false) is not true then
    return query select null::uuid, null::text, null::timestamptz, false, 'invalid_request'::text;
    return;
  end if;

  if normalized_email is not null
    and normalized_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    return query select null::uuid, null::text, null::timestamptz, false, 'invalid_email'::text;
    return;
  end if;

  if normalized_fingerprint is not null then
    window_bucket := to_timestamp(
      floor(extract(epoch from timezone('utc', now())) / 900) * 900
    );

    insert into public.inquiry_rate_limits (fingerprint, window_start, attempts)
    values (normalized_fingerprint, window_bucket, 1)
    on conflict (fingerprint, window_start) do update
      set attempts = public.inquiry_rate_limits.attempts + 1
    returning attempts into request_count;

    if request_count > 5 then
      return query select null::uuid, null::text, null::timestamptz, false, 'rate_limited'::text;
      return;
    end if;
  end if;

  insert into public.intake_submissions (
    kind,
    intent,
    name,
    email,
    phone,
    title,
    service,
    budget,
    timeline,
    message,
    payload,
    status,
    ticket_number,
    site_key,
    source_page,
    source_cta,
    source_url,
    referrer,
    utm,
    preferred_channel,
    priority,
    last_activity_at,
    consent_at,
    idempotency_key
  )
  values (
    case normalized_intent when 'general' then 'contact' else normalized_intent end,
    normalized_intent,
    normalized_name,
    normalized_email,
    normalized_phone,
    nullif(trim(coalesce(target_payload->>'title', '')), ''),
    nullif(trim(coalesce(target_payload->>'service', '')), ''),
    nullif(trim(coalesce(target_payload->>'budget', '')), ''),
    nullif(trim(coalesce(target_payload->>'timeline', '')), ''),
    normalized_message,
    coalesce(target_payload->'payload', '{}'::jsonb),
    'new',
    public.next_inquiry_ticket_number(),
    coalesce(nullif(target_payload->>'site_key', ''), 'olympus'),
    nullif(target_payload->>'source_page', ''),
    nullif(target_payload->>'source_cta', ''),
    nullif(target_payload->>'source_url', ''),
    nullif(target_payload->>'referrer', ''),
    coalesce(target_payload->'utm', '{}'::jsonb),
    coalesce(normalized_channel, case when normalized_phone is not null then 'whatsapp' else 'email' end),
    'normal',
    timezone('utc', now()),
    timezone('utc', now()),
    normalized_idempotency
  )
  returning id, intake_submissions.ticket_number, intake_submissions.created_at
  into created_record;

  return query select
    created_record.id,
    created_record.ticket_number,
    created_record.created_at,
    true,
    null::text;
end;
$$;

create or replace function public.set_inquiry_status(
  target_inquiry_id uuid,
  target_status text,
  target_note text default null
)
returns public.intake_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_status text;
  updated_record public.intake_submissions;
begin
  if not public.can_manage_inquiries() then
    raise exception 'You do not have permission to manage enquiries';
  end if;
  if target_status not in ('new', 'in_review', 'waiting_for_client', 'qualified', 'closed', 'spam') then
    raise exception 'This enquiry status is not available';
  end if;

  select status into previous_status
  from public.intake_submissions
  where id = target_inquiry_id
  for update;
  if not found then raise exception 'Enquiry not found'; end if;

  update public.intake_submissions
  set
    status = target_status,
    first_responded_at = case
      when target_status = 'in_review' then coalesce(first_responded_at, timezone('utc', now()))
      else first_responded_at
    end,
    closed_at = case when target_status in ('closed', 'spam') then timezone('utc', now()) else null end,
    last_activity_at = timezone('utc', now()),
    spam_reason = case when target_status = 'spam' then nullif(trim(target_note), '') else null end
  where id = target_inquiry_id
  returning * into updated_record;

  insert into public.inquiry_events (
    inquiry_id, actor_id, event_type, from_value, to_value, metadata
  )
  values (
    target_inquiry_id,
    auth.uid(),
    'status_changed',
    previous_status,
    target_status,
    case when nullif(trim(target_note), '') is null
      then '{}'::jsonb
      else jsonb_build_object('note', trim(target_note))
    end
  );

  if nullif(trim(target_note), '') is not null and target_status <> 'spam' then
    insert into public.inquiry_messages (
      inquiry_id, channel, direction, sender_type, actor_id, body
    )
    values (
      target_inquiry_id, 'internal', 'internal', 'staff', auth.uid(), trim(target_note)
    );
  end if;

  update public.notifications
  set read_at = coalesce(read_at, timezone('utc', now()))
  where inquiry_id = target_inquiry_id and recipient_id = auth.uid();

  return updated_record;
end;
$$;

create or replace function public.assign_inquiry(
  target_inquiry_id uuid,
  target_assignee uuid
)
returns public.intake_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_assignee uuid;
  updated_record public.intake_submissions;
begin
  if not public.can_manage_inquiries() then
    raise exception 'You do not have permission to assign enquiries';
  end if;
  if target_assignee is not null and not exists (
    select 1 from public.profiles
    where id = target_assignee
      and role in ('owner', 'project_manager', 'contributor')
  ) then
    raise exception 'That person cannot be assigned enquiries';
  end if;

  select assigned_to into previous_assignee
  from public.intake_submissions
  where id = target_inquiry_id
  for update;
  if not found then raise exception 'Enquiry not found'; end if;

  update public.intake_submissions
  set assigned_to = target_assignee, last_activity_at = timezone('utc', now())
  where id = target_inquiry_id
  returning * into updated_record;

  insert into public.inquiry_events (
    inquiry_id, actor_id, event_type, from_value, to_value
  )
  values (
    target_inquiry_id,
    auth.uid(),
    'assigned',
    previous_assignee::text,
    target_assignee::text
  );

  if target_assignee is not null and target_assignee <> auth.uid() then
    insert into public.notifications (
      recipient_id, inquiry_id, notification_type, title, body
    )
    values (
      target_assignee,
      target_inquiry_id,
      'inquiry_assigned',
      'An enquiry was assigned to you',
      updated_record.ticket_number
    );
  end if;

  return updated_record;
end;
$$;

create or replace function public.add_inquiry_message(
  target_inquiry_id uuid,
  target_body text,
  target_channel text default 'internal',
  target_direction text default 'internal'
)
returns public.inquiry_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  created_message public.inquiry_messages;
begin
  if not public.can_manage_inquiries() then
    raise exception 'You do not have permission to update enquiries';
  end if;
  if target_channel not in ('internal', 'whatsapp', 'phone', 'email')
    or target_direction not in ('internal', 'outbound') then
    raise exception 'Unsupported enquiry message type';
  end if;
  if char_length(trim(coalesce(target_body, ''))) not between 1 and 10000 then
    raise exception 'Add a message before saving';
  end if;

  insert into public.inquiry_messages (
    inquiry_id,
    channel,
    direction,
    sender_type,
    actor_id,
    body,
    delivery_status
  )
  values (
    target_inquiry_id,
    target_channel,
    target_direction,
    'staff',
    auth.uid(),
    trim(target_body),
    case when target_channel in ('whatsapp', 'phone') then 'sent' else null end
  )
  returning * into created_message;

  update public.intake_submissions
  set
    last_activity_at = timezone('utc', now()),
    first_responded_at = coalesce(first_responded_at, timezone('utc', now()))
  where id = target_inquiry_id;

  insert into public.inquiry_events (
    inquiry_id, actor_id, event_type, to_value, metadata
  )
  values (
    target_inquiry_id,
    auth.uid(),
    'message_logged',
    target_channel,
    jsonb_build_object('direction', target_direction)
  );

  return created_message;
end;
$$;

create or replace function public.mark_inquiry_notifications_read(target_inquiry_id uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.notifications
  set read_at = coalesce(read_at, timezone('utc', now()))
  where recipient_id = auth.uid()
    and inquiry_id = target_inquiry_id;
$$;

create or replace function public.mark_all_notifications_read()
returns void
language sql
security invoker
set search_path = public
as $$
  update public.notifications
  set read_at = coalesce(read_at, timezone('utc', now()))
  where recipient_id = auth.uid()
    and read_at is null;
$$;

create or replace function public.get_inquiry_metrics()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.can_manage_inquiries() then '{}'::jsonb
    else jsonb_build_object(
      'new', count(*) filter (where status = 'new'),
      'open', count(*) filter (where status in ('new', 'in_review', 'waiting_for_client', 'qualified')),
      'converted', count(*) filter (where status = 'converted'),
      'conversion_rate', case
        when count(*) filter (where status <> 'spam') = 0 then 0
        else round(
          100.0 * count(*) filter (where status = 'converted')
          / count(*) filter (where status <> 'spam'),
          1
        )
      end,
      'average_first_response_hours', coalesce(round(avg(
        extract(epoch from (first_responded_at - created_at)) / 3600
      ) filter (where first_responded_at is not null), 1), 0),
      'top_services', coalesce((
        select jsonb_agg(service_row order by enquiry_count desc)
        from (
          select coalesce(nullif(service, ''), 'General') as service, count(*) as enquiry_count
          from public.intake_submissions
          where status <> 'spam'
          group by coalesce(nullif(service, ''), 'General')
          order by count(*) desc
          limit 5
        ) as service_row
      ), '[]'::jsonb),
      'top_sources', coalesce((
        select jsonb_agg(source_row order by enquiry_count desc)
        from (
          select coalesce(nullif(source_page, ''), 'Direct') as source, count(*) as enquiry_count
          from public.intake_submissions
          where status <> 'spam'
          group by coalesce(nullif(source_page, ''), 'Direct')
          order by count(*) desc
          limit 5
        ) as source_row
      ), '[]'::jsonb)
    )
  end
  from public.intake_submissions;
$$;

create or replace function public.mark_intake_converted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_status text;
begin
  if new.intake_submission_id is not null then
    select status into previous_status
    from public.intake_submissions
    where id = new.intake_submission_id
    for update;

    update public.intake_submissions
    set
      status = 'converted',
      converted_project_id = new.id,
      client_id = new.client_id,
      last_activity_at = timezone('utc', now()),
      closed_at = timezone('utc', now())
    where id = new.intake_submission_id;

    insert into public.inquiry_events (
      inquiry_id, actor_id, event_type, from_value, to_value, metadata
    )
    values (
      new.intake_submission_id,
      new.created_by,
      'converted',
      previous_status,
      'converted',
      jsonb_build_object('project_id', new.id, 'client_id', new.client_id)
    );
  end if;
  return new;
end;
$$;

drop policy if exists "public create intake" on public.intake_submissions;
drop policy if exists "internal manage intake" on public.intake_submissions;
create policy "enquiry team manage intake"
on public.intake_submissions
for all
to authenticated
using (public.can_manage_inquiries())
with check (public.can_manage_inquiries());

alter table public.inquiry_ticket_sequences enable row level security;
alter table public.inquiry_messages enable row level security;
alter table public.inquiry_events enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.inquiry_rate_limits enable row level security;

create policy "enquiry team read messages"
on public.inquiry_messages
for select
to authenticated
using (public.can_manage_inquiries());
create policy "enquiry team manage messages"
on public.inquiry_messages
for all
to authenticated
using (public.can_manage_inquiries())
with check (public.can_manage_inquiries());

create policy "enquiry team read events"
on public.inquiry_events
for select
to authenticated
using (public.can_manage_inquiries());

create policy "users read own notifications"
on public.notifications
for select
to authenticated
using (recipient_id = auth.uid());
create policy "users update own notifications"
on public.notifications
for update
to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

create policy "owners read notification deliveries"
on public.notification_deliveries
for select
to authenticated
using (public.has_role(array['owner']));

grant select, insert, update, delete on public.intake_submissions to authenticated;
grant select, insert, update, delete on public.inquiry_messages to authenticated;
grant select on public.inquiry_events to authenticated;
grant select, update on public.notifications to authenticated;
grant select on public.notification_deliveries to authenticated;
grant usage, select on all sequences in schema public to authenticated;

revoke insert on public.intake_submissions from anon;
revoke all on public.inquiry_ticket_sequences from anon, authenticated;
revoke all on public.inquiry_rate_limits from anon, authenticated;
revoke all on function public.create_public_inquiry(jsonb, text) from public, anon, authenticated;
grant execute on function public.create_public_inquiry(jsonb, text) to service_role;
revoke all on function public.next_inquiry_ticket_number() from public, anon, authenticated;
grant execute on function public.set_inquiry_status(uuid, text, text) to authenticated;
grant execute on function public.assign_inquiry(uuid, uuid) to authenticated;
grant execute on function public.add_inquiry_message(uuid, text, text, text) to authenticated;
grant execute on function public.mark_inquiry_notifications_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.get_inquiry_metrics() to authenticated;

drop trigger if exists set_notification_deliveries_updated_at on public.notification_deliveries;
create trigger set_notification_deliveries_updated_at
before update on public.notification_deliveries
for each row execute function public.set_updated_at();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;

commit;
