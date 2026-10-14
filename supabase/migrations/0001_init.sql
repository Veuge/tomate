-- Pomodoro schema. Run in the Supabase SQL editor or with `supabase db push`.

create table public.tags (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  color text not null,
  icon text not null,
  archived boolean not null default false,
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  tag_id uuid references public.tags on delete set null,
  kind text not null check (kind in ('focus', 'short_break', 'long_break')),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  planned_seconds int not null,
  actual_seconds int not null,
  completed boolean not null,
  device text not null default 'web',
  tz text not null default 'UTC',
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  synced_at timestamptz not null default now()
);

create table public.settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index sessions_user_started on public.sessions (user_id, started_at);
create index sessions_user_synced on public.sessions (user_id, synced_at);
create index tags_user_synced on public.tags (user_id, synced_at);

-- synced_at is the server's pull cursor: always set by the database, never the client.
create function public.touch_synced_at() returns trigger language plpgsql as $$
begin
  new.synced_at := clock_timestamp();
  return new;
end $$;

create trigger tags_synced before insert or update on public.tags
  for each row execute function public.touch_synced_at();
create trigger sessions_synced before insert or update on public.sessions
  for each row execute function public.touch_synced_at();

alter table public.tags enable row level security;
alter table public.sessions enable row level security;
alter table public.settings enable row level security;

create policy "own tags" on public.tags for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own sessions" on public.sessions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own settings" on public.settings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter publication supabase_realtime add table public.tags, public.sessions, public.settings;
