# Olympus operations setup

## Supabase

1. Link this repository to the intended Supabase project:

   ```sh
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

2. In Supabase Authentication, create the first team user.

3. Promote that user once, using the SQL editor:

   ```sql
   update public.profiles
   set role = 'owner', full_name = 'Your name'
   where id = (select id from auth.users where email = 'YOUR_EMAIL');
   ```

All later role changes can be managed by an owner. New authentication accounts default to the restricted `client` role.

## Vercel

Add these variables to Production, Preview, and Development:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

The anonymous key is intentionally used by the browser. Row-level security is the authorization boundary. Never add or expose the Supabase service-role key.

## Routes

- `/` — public studio website and enquiry forms
- `/admin` — internal workspace
- `/portal` — client project portal

## Operational safeguards

- Invoice totals lock after finalization.
- Paid and void invoices are terminal.
- Clients only see assigned projects.
- Client deliverable updates are limited to approval or change requests.
- Public users can create intake submissions but cannot read them.
- Website images upload to the `site-media` bucket with a 20 MB limit.
