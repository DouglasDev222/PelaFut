create table public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (match_id, player_id)
);

create index match_players_match_id_idx on public.match_players (match_id);

alter table public.match_players enable row level security;

create policy "match_players_select_own"
  on public.match_players for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_players.match_id and m.owner_id = auth.uid()
    )
  );

create policy "match_players_insert_own"
  on public.match_players for insert
  with check (
    exists (
      select 1 from public.matches m
      where m.id = match_players.match_id and m.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.players p
      where p.id = match_players.player_id and p.owner_id = auth.uid()
    )
  );

create policy "match_players_delete_own"
  on public.match_players for delete
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_players.match_id and m.owner_id = auth.uid()
    )
  );
