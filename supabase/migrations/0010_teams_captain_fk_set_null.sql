-- Excluir um peladeiro que é capitão de algum time não deveria falhar; o
-- time simplesmente perde a referência de capitão em vez de bloquear a
-- exclusão (diferente de team_players.player_id, que remove o jogador do
-- time por completo via cascade).
alter table public.teams drop constraint teams_captain_player_id_fkey;

alter table public.teams
  add constraint teams_captain_player_id_fkey
  foreign key (captain_player_id) references public.players(id) on delete set null;
