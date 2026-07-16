create table public.teams (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  name text not null,
  color text not null,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create index teams_match_id_idx on public.teams (match_id);

alter table public.teams enable row level security;

create policy "teams_select_own"
  on public.teams for select
  using (
    exists (select 1 from public.matches m where m.id = teams.match_id and m.owner_id = auth.uid())
  );

create policy "teams_insert_own"
  on public.teams for insert
  with check (
    exists (select 1 from public.matches m where m.id = teams.match_id and m.owner_id = auth.uid())
  );

create policy "teams_update_own"
  on public.teams for update
  using (
    exists (select 1 from public.matches m where m.id = teams.match_id and m.owner_id = auth.uid())
  );

create policy "teams_delete_own"
  on public.teams for delete
  using (
    exists (select 1 from public.matches m where m.id = teams.match_id and m.owner_id = auth.uid())
  );

create table public.team_players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  is_goalkeeper boolean not null default false,
  unique (team_id, player_id)
);

create index team_players_team_id_idx on public.team_players (team_id);

alter table public.team_players enable row level security;

create policy "team_players_select_own"
  on public.team_players for select
  using (
    exists (
      select 1 from public.teams t
      join public.matches m on m.id = t.match_id
      where t.id = team_players.team_id and m.owner_id = auth.uid()
    )
  );

create policy "team_players_insert_own"
  on public.team_players for insert
  with check (
    exists (
      select 1 from public.teams t
      join public.matches m on m.id = t.match_id
      where t.id = team_players.team_id and m.owner_id = auth.uid()
    )
    and exists (select 1 from public.players p where p.id = team_players.player_id and p.owner_id = auth.uid())
  );

create policy "team_players_delete_own"
  on public.team_players for delete
  using (
    exists (
      select 1 from public.teams t
      join public.matches m on m.id = t.match_id
      where t.id = team_players.team_id and m.owner_id = auth.uid()
    )
  );
