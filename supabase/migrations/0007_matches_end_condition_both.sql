-- Permite que o critério de término seja tempo, gols, ou os dois ao mesmo
-- tempo (a partida acaba no que ocorrer primeiro: ex. 7 minutos ou 2 gols).
alter table public.matches drop constraint end_condition_fields;
alter table public.matches drop constraint matches_end_condition_check;

alter table public.matches
  add constraint matches_end_condition_check
  check (end_condition in ('time', 'goals', 'both'));

alter table public.matches
  add constraint end_condition_fields check (
    (end_condition = 'time' and match_duration_minutes is not null and goals_to_win is null)
    or (end_condition = 'goals' and goals_to_win is not null and match_duration_minutes is null)
    or (end_condition = 'both' and match_duration_minutes is not null and goals_to_win is not null)
  );
