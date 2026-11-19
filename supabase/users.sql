-- Authoritative user identity/profile only. Do not store diagnosis photos,
-- reports, model files, analytics, market data, or shared crop intelligence.
create table if not exists public.app_users (
  id bigint generated always as identity primary key,
  google_sub text unique not null,
  email text not null,
  email_verified boolean default false,
  name text,
  picture_url text,
  locale text,
  created_at timestamptz default now(),
  last_login_at timestamptz default now(),
  login_count integer default 1
);

alter table public.app_users enable row level security;

create policy "users can read own row"
  on public.app_users
  for select
  using (auth.uid()::text = google_sub or auth.role() = 'service_role');

-- The application uses a server-side Google verification flow and the
-- Supabase service-role key for writes. The service role bypasses RLS; no
-- browser client should receive permission to insert or update these rows.
