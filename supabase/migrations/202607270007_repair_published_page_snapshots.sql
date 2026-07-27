begin;

do $$
declare
  page_row record;
  current_snapshot jsonb;
  next_revision integer;
begin
  for page_row in
    select *
    from public.pages
    where status = 'published'
      and has_unpublished_changes = false
  loop
    current_snapshot := jsonb_build_object(
      'title', page_row.title,
      'slug', page_row.slug,
      'content', page_row.content,
      'seo_title', page_row.seo_title,
      'seo_description', page_row.seo_description
    );

    if page_row.published_snapshot is distinct from current_snapshot then
      update public.pages
      set published_snapshot = current_snapshot
      where id = page_row.id;

      select coalesce(max(revision_number), 0) + 1
      into next_revision
      from public.content_revisions
      where entity_type = 'page'
        and entity_id = page_row.id;

      insert into public.content_revisions (
        entity_type,
        entity_id,
        revision_number,
        snapshot
      )
      values (
        'page',
        page_row.id,
        next_revision,
        current_snapshot
      );
    end if;
  end loop;
end;
$$;

commit;
