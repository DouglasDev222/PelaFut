create table public.match_rounds (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sequence smallint not null,
  home_team_id uuid not null references public.teams(id) on delete cascade,
  away_team_id uuid not null references public.teams(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'finished')),
  result text check (result in ('home_win', 'away_win', 'tie')),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index match_rounds_match_id_idx on public.match_rounds (match_id);

alter table public.match_rounds enable row level security;

create policy "match_rounds_select_own"
  on public.match_rounds for select
  using (
    exists (select 1 from public.matches m where m.id = match_rounds.match_id and m.owner_id = auth.uid())
  );

create policy "match_rounds_insert_own"
  on public.match_rounds for insert
  with check (
    exists (select 1 from public.matches m where m.id = match_rounds.match_id and m.owner_id = auth.uid())
  );

create policy "match_rounds_update_own"
  on public.match_rounds for update
  using (
    exists (select 1 from public.matches m where m.id = match_rounds.match_id and m.owner_id = auth.uid())
  );

create policy "match_rounds_delete_own"
  on public.match_rounds for delete
  using (
    exists (select 1 from public.matches m where m.id = match_rounds.match_id and m.owner_id = auth.uid())
  );

create table public.match_round_goals (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.match_rounds(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index match_round_goals_round_id_idx on public.match_round_goals (round_id);

alter table public.match_round_goals enable row level security;

create policy "match_round_goals_select_own"
  on public.match_round_goals for select
  using (
    exists (
      select 1 from public.match_rounds r
      join public.matches m on m.id = r.match_id
      where r.id = match_round_goals.round_id and m.owner_id = auth.uid()
    )
  );

create policy "match_round_goals_insert_own"
  on public.match_round_goals for insert
  with check (
    exists (
      select 1 from public.match_rounds r
      join public.matches m on m.id = r.match_id
      where r.id = match_round_goals.round_id and m.owner_id = auth.uid()
    )
  );

create policy "match_round_goals_delete_own"
  on public.match_round_goals for delete
  using (
    exists (
      select 1 from public.match_rounds r
      join public.matches m on m.id = r.match_id
      where r.id = match_round_goals.round_id and m.owner_id = auth.uid()
    )
  );

create table public.match_round_borrowed_players (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.match_rounds(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  borrowed_from_team_id uuid not null references public.teams(id) on delete cascade,
  unique (round_id, team_id, player_id)
);

create index match_round_borrowed_players_round_id_idx on public.match_round_borrowed_players (round_id);

alter table public.match_round_borrowed_players enable row level security;

create policy "match_round_borrowed_players_select_own"
  on public.match_round_borrowed_players for select
  using (
    exists (
      select 1 from public.match_rounds r
      join public.matches m on m.id = r.match_id
      where r.id = match_round_borrowed_players.round_id and m.owner_id = auth.uid()
    )
  );

create policy "match_round_borrowed_players_insert_own"
  on public.match_round_borrowed_players for insert
  with check (
    exists (
      select 1 from public.match_rounds r
      join public.matches m on m.id = r.match_id
      where r.id = match_round_borrowed_players.round_id and m.owner_id = auth.uid()
    )
  );

create policy "match_round_borrowed_players_delete_own"
  on public.match_round_borrowed_players for delete
  using (
    exists (
      select 1 from public.match_rounds r
      join public.matches m on m.id = r.match_id
      where r.id = match_round_borrowed_players.round_id and m.owner_id = auth.uid()
    )
  );
