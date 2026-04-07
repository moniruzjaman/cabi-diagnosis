-- ============================================================
-- উদ্ভিদ গোয়েন্দা (Plant Detective) — Supabase Schema
-- Run this SQL in the Supabase SQL Editor or via:
--   supabase db push
-- ============================================================

-- ─── 1. Analytics state (single-row, aggregated counters) ──
create table if not exists public.analytics_state (
  id text primary key,
  total_visits integer not null default 0,
  unique_visitors integer not null default 0,
  visitors jsonb not null default '{}'::jsonb,
  sections jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- ─── 2. Feedback entries ────────────────────────────────────
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

-- ─── 3. Real-time presence tracking ────────────────────────
create table if not exists public.presence_log (
  id bigint generated always as identity primary key,
  visitor_id text not null,
  section text not null default 'home',
  user_agent text not null default '',
  ip_hash text not null default '',
  country text not null default '',
  is_pwa boolean not null default false,
  last_heartbeat timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Index for fast "active now" queries (within last 5 min)
create index if not exists idx_presence_log_heartbeat on public.presence_log(last_heartbeat);

-- Index for daily visitor queries
create index if not exists idx_presence_log_created on public.presence_log(created_at);

-- ─── 4. Daily stats summary (aggregated per day) ──────────
create table if not exists public.daily_stats (
  id bigint generated always as identity primary key,
  stat_date date not null default current_date,
  total_visits integer not null default 0,
  unique_visitors integer not null default 0,
  peak_online integer not null default 0,
  sections jsonb not null default '{}'::jsonb,
  unique(stat_date)
);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

alter table public.analytics_state enable row level security;
alter table public.feedback_entries enable row level security;
alter table public.presence_log enable row level security;
alter table public.daily_stats enable row level security;

-- ─── Analytics state policies (anon can read/write main row) ──
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.analytics_state to anon, authenticated;
grant insert on public.feedback_entries to anon, authenticated;
grant select, insert, update, delete on public.presence_log to anon, authenticated;
grant select, insert, update on public.daily_stats to anon, authenticated;

drop policy if exists "analytics_state_select_public" on public.analytics_state;
create policy "analytics_state_select_public"
  on public.analytics_state for select
  to anon, authenticated
  using (id = 'main');

drop policy if exists "analytics_state_insert_public" on public.analytics_state;
create policy "analytics_state_insert_public"
  on public.analytics_state for insert
  to anon, authenticated
  with check (id = 'main');

drop policy if exists "analytics_state_update_public" on public.analytics_state;
create policy "analytics_state_update_public"
  on public.analytics_state for update
  to anon, authenticated
  using (id = 'main')
  with check (id = 'main');

-- ─── Feedback entries policy ───────────────────────────────
drop policy if exists "feedback_entries_insert_public" on public.feedback_entries;
create policy "feedback_entries_insert_public"
  on public.feedback_entries for insert
  to anon, authenticated
  with check (
    char_length(context) <= 120 and
    char_length(feedback) <= 4000 and
    char_length(email) <= 320 and
    char_length(summary) <= 2000 and
    char_length(visitor_id) <= 120 and
    rating >= 0 and rating <= 5
  );

-- ─── Presence log policies ─────────────────────────────────
drop policy if exists "presence_log_insert_public" on public.presence_log;
create policy "presence_log_insert_public"
  on public.presence_log for insert
  to anon, authenticated
  with check (
    char_length(visitor_id) <= 120 and
    char_length(section) <= 50 and
    char_length(user_agent) <= 500 and
    char_length(ip_hash) <= 64 and
    char_length(country) <= 100
  );

drop policy if exists "presence_log_select_public" on public.presence_log;
create policy "presence_log_select_public"
  on public.presence_log for select
  to anon, authenticated
  using (true);

drop policy if exists "presence_log_update_public" on public.presence_log;
create policy "presence_log_update_public"
  on public.presence_log for update
  to anon, authenticated
  using (true);

drop policy if exists "presence_log_delete_public" on public.presence_log;
create policy "presence_log_delete_public"
  on public.presence_log for delete
  to anon, authenticated
  using (true);

-- ─── Daily stats policies ──────────────────────────────────
drop policy if exists "daily_stats_select_public" on public.daily_stats;
create policy "daily_stats_select_public"
  on public.daily_stats for select
  to anon, authenticated
  using (true);

drop policy if exists "daily_stats_insert_public" on public.daily_stats;
create policy "daily_stats_insert_public"
  on public.daily_stats for insert
  to anon, authenticated
  with check (true);

drop policy if exists "daily_stats_update_public" on public.daily_stats;
create policy "daily_stats_update_public"
  on public.daily_stats for update
  to anon, authenticated
  using (true);

-- ============================================================
-- Enable Realtime for presence_log table
-- This allows WebSocket subscriptions for live updates
-- ============================================================
alter publication supabase_realtime add table public.presence_log;

-- ============================================================
-- Cleanup function for stale presence records (older than 10 min)
-- Can be called manually or via pg_cron
-- ============================================================
create or replace function public.cleanup_stale_presence()
returns void as $$
begin
  delete from public.presence_log
  where last_heartbeat < now() - interval '10 minutes';
end;
$$ language sql security definer;
