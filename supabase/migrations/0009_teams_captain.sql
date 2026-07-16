alter table public.teams
  add column captain_player_id uuid references public.players(id) on delete set null;
