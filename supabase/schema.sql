create table if not exists public.analytics_state (
  id text primary key,
  total_visits integer not null default 0,
  unique_visitors integer not null default 0,
  visitors jsonb not null default '{}'::jsonb,
  sections jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.feedback_entries (
  id bigint generated always as identity primary key,
  context text not null,
  rating integer not null default 0,
  feedback text not null default '',
  email text not null default '',
  summary text not null default '',
  visitor_id text not null default '',
  created_at timestamptz not null default now()
);

alter table public.analytics_state enable row level security;
alter table public.feedback_entries enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.analytics_state to anon, authenticated;
grant insert on public.feedback_entries to anon, authenticated;

drop policy if exists "analytics_state_select_public" on public.analytics_state;
create policy "analytics_state_select_public"
on public.analytics_state
for select
to anon, authenticated
using (id = 'main');

drop policy if exists "analytics_state_insert_public" on public.analytics_state;
create policy "analytics_state_insert_public"
on public.analytics_state
for insert
to anon, authenticated
with check (id = 'main');

drop policy if exists "analytics_state_update_public" on public.analytics_state;
create policy "analytics_state_update_public"
on public.analytics_state
for update
to anon, authenticated
using (id = 'main')
with check (id = 'main');

drop policy if exists "feedback_entries_insert_public" on public.feedback_entries;
create policy "feedback_entries_insert_public"
on public.feedback_entries
for insert
to anon, authenticated
with check (
  char_length(context) <= 120 and
  char_length(feedback) <= 4000 and
  char_length(email) <= 320 and
  char_length(summary) <= 2000 and
  char_length(visitor_id) <= 120 and
  rating >= 0 and rating <= 5
);
