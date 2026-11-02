-- User identity only. Do not store diagnosis photos, reports, or model files.
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
