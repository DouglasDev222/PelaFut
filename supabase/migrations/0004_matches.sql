create table public.matches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  location text,
  match_date date not null,
  start_time time,
  max_players smallint not null check (max_players > 0),
  players_per_team smallint not null check (players_per_team > 0),
  end_condition text not null check (end_condition in ('time', 'goals', 'both')),
  match_duration_minutes smallint check (match_duration_minutes is null or match_duration_minutes > 0),
  goals_to_win smallint check (goals_to_win is null or goals_to_win > 0),
  tie_both_leave_allowed boolean not null default true,
  max_time_per_team_minutes smallint check (max_time_per_team_minutes is null or max_time_per_team_minutes > 0),
  status text not null default 'draft' check (status in ('draft', 'teams_formed', 'in_progress', 'finished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint end_condition_fields check (
    (end_condition = 'time' and match_duration_minutes is not null and goals_to_win is null)
    or (end_condition = 'goals' and goals_to_win is not null and match_duration_minutes is null)
    or (end_condition = 'both' and match_duration_minutes is not null and goals_to_win is not null)
  )
);

create index matches_owner_id_idx on public.matches (owner_id);
create index matches_match_date_idx on public.matches (match_date);

alter table public.matches enable row level security;

create policy "matches_select_own"
  on public.matches for select
  using (owner_id = auth.uid());

create policy "matches_insert_own"
  on public.matches for insert
  with check (owner_id = auth.uid());

create policy "matches_update_own"
  on public.matches for update
  using (owner_id = auth.uid());

create policy "matches_delete_own"
  on public.matches for delete
  using (owner_id = auth.uid());

create trigger matches_set_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();
