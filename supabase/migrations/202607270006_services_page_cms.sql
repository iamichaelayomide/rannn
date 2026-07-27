begin;

insert into public.pages (
  slug,
  title,
  status,
  content,
  seo_title,
  seo_description,
  published_snapshot,
  published_at,
  has_unpublished_changes
)
values (
  'services',
  'Services',
  'published',
  '{
    "header": {
      "eyebrow": "What we make",
      "title": "Creative services grounded in real work.",
      "body": "From the first frame to the final layout, Olympus brings production, post, and design together under one clear creative direction."
    }
  }'::jsonb,
  'Creative Services | Olympus Studio',
  'Photography, film, design, editorial, motion, events, and website services from Olympus Studio.',
  jsonb_build_object(
    'title', 'Services',
    'slug', 'services',
    'content', '{
      "header": {
        "eyebrow": "What we make",
        "title": "Creative services grounded in real work.",
        "body": "From the first frame to the final layout, Olympus brings production, post, and design together under one clear creative direction."
      }
    }'::jsonb,
    'seo_title', 'Creative Services | Olympus Studio',
    'seo_description', 'Photography, film, design, editorial, motion, events, and website services from Olympus Studio.'
  ),
  timezone('utc', now()),
  false
)
on conflict (slug) do nothing;

commit;
