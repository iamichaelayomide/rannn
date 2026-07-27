begin;

update public.pages
set content = replace(
      content::text,
      'Premium Media Atelier',
      'Premium Atelier'
    )::jsonb,
    published_snapshot = case
      when published_snapshot is null then null
      else replace(
        published_snapshot::text,
        'Premium Media Atelier',
        'Premium Atelier'
      )::jsonb
    end,
    has_unpublished_changes = false,
    published_at = case
      when published_snapshot is null then published_at
      else timezone('utc', now())
    end
where content::text like '%Premium Media Atelier%'
   or coalesce(published_snapshot::text, '') like '%Premium Media Atelier%';

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
  and page.published_snapshot::text like '%Premium Atelier%';

commit;
