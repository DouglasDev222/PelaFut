alter table public.match_round_goals
  alter column player_id drop not null,
  add column assist_player_id uuid references public.players(id) on delete set null;

alter table public.match_rounds
  add column decided_by text check (decided_by in ('regulation', 'penalties', 'direct'));

create table public.match_round_penalty_kicks (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.match_rounds(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  sequence smallint not null,
  scored boolean not null,
  created_at timestamptz not null default now()
);

create index match_round_penalty_kicks_round_id_idx on public.match_round_penalty_kicks (round_id);

alter table public.match_round_penalty_kicks enable row level security;

create policy "match_round_penalty_kicks_select_own"
  on public.match_round_penalty_kicks for select
  using (
    exists (
      select 1 from public.match_rounds r
      join public.matches m on m.id = r.match_id
      where r.id = match_round_penalty_kicks.round_id and m.owner_id = auth.uid()
    )
  );

create policy "match_round_penalty_kicks_insert_own"
  on public.match_round_penalty_kicks for insert
  with check (
    exists (
      select 1 from public.match_rounds r
      join public.matches m on m.id = r.match_id
      where r.id = match_round_penalty_kicks.round_id and m.owner_id = auth.uid()
    )
  );

create policy "match_round_penalty_kicks_delete_own"
  on public.match_round_penalty_kicks for delete
  using (
    exists (
      select 1 from public.match_rounds r
      join public.matches m on m.id = r.match_id
      where r.id = match_round_penalty_kicks.round_id and m.owner_id = auth.uid()
    )
  );
