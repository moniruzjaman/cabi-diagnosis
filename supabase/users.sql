-- User identity only. Do not store diagnosis photos, reports, or model files.
create table if not exists public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  google_sub text unique,
  phone text unique,
  email text,
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
  using (auth.uid() = id);

create policy "users can update own row"
  on public.app_users
  for update
  using (auth.uid() = id);

create policy "service role all"
  on public.app_users
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
