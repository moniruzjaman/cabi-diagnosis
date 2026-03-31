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
