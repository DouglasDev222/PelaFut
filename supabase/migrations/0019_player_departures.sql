-- Jogador que sai no meio da pelada.
--
-- Um jogador que vai embora NÃO pode ser removido de `team_players`: as
-- estatísticas derivam do elenco atual aplicado a todas as rodadas, então
-- apagá-lo reescreveria retroativamente os jogos que ele realmente jogou.
-- Em vez disso, registra-se uma ausência "a partir da rodada N": ele conta
-- como presente em toda rodada com `sequence < from_sequence` e ausente de
-- `from_sequence` em diante. `from_sequence` = (maior sequence existente) + 1
-- no momento de marcar, então a saída vale a partir do próximo jogo.

create table public.match_player_departures (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  from_sequence smallint not null,
  unique (match_id, player_id)
);

create index match_player_departures_match_id_idx
  on public.match_player_departures (match_id);

alter table public.match_player_departures enable row level security;

create policy "match_player_departures_select_own"
  on public.match_player_departures for select
  using (
    exists (select 1 from public.matches m where m.id = match_player_departures.match_id and m.owner_id = auth.uid())
  );

create policy "match_player_departures_insert_own"
  on public.match_player_departures for insert
  with check (
    exists (select 1 from public.matches m where m.id = match_player_departures.match_id and m.owner_id = auth.uid())
  );

create policy "match_player_departures_update_own"
  on public.match_player_departures for update
  using (
    exists (select 1 from public.matches m where m.id = match_player_departures.match_id and m.owner_id = auth.uid())
  );

create policy "match_player_departures_delete_own"
  on public.match_player_departures for delete
  using (
    exists (select 1 from public.matches m where m.id = match_player_departures.match_id and m.owner_id = auth.uid())
  );

-- Atualiza o RPC público para enviar as ausências. Sem isso a estatística
-- pública contaria o jogador que saiu nas rodadas seguintes, divergindo da
-- privada. É a mesma função da 0015, só com a CTE `saidas` e o campo
-- `departures` no JSON.
create or replace function public.pelada_publica_dados(codigo text, jogo_id uuid default null)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_title text;
  v_result json;
begin
  select p.id, p.public_title into v_owner, v_title
  from public.profiles p
  where p.public_code = codigo and p.public_stats_enabled;

  if v_owner is null then
    return null;
  end if;

  with peladas as (
    select m.id, m.name, m.match_date
    from public.matches m
    where m.owner_id = v_owner
      and m.status = 'finished'
      and (jogo_id is null or m.id = jogo_id)
  ),
  times as (
    select t.id, t.match_id, t.position, t.color
    from public.teams t
    join peladas pe on pe.id = t.match_id
  ),
  elencos as (
    select tp.team_id, tp.player_id
    from public.team_players tp
    join times ti on ti.id = tp.team_id
  ),
  rodadas as (
    select r.id, r.match_id, r.sequence, r.home_team_id, r.away_team_id,
           r.status, r.result, r.decided_by
    from public.match_rounds r
    join peladas pe on pe.id = r.match_id
    where r.status = 'finished'
  ),
  gols as (
    select g.id, g.round_id, g.team_id, g.player_id, g.assist_player_id, g.created_at
    from public.match_round_goals g
    join rodadas ro on ro.id = g.round_id
  ),
  emprestados as (
    select b.round_id, b.team_id, b.player_id
    from public.match_round_borrowed_players b
    join rodadas ro on ro.id = b.round_id
  ),
  saidas as (
    select d.team_id, d.player_id, d.from_sequence
    from public.match_player_departures d
    join peladas pe on pe.id = d.match_id
  ),
  ids as (
    select el.player_id from elencos el
    union
    select em.player_id from emprestados em
  ),
  jogadores as (
    -- WHITELIST: só o que pode ser público. Nunca birth_date, notes,
    -- skill_level, shirt_number, active ou owner_id.
    select pl.id, pl.name, pl.nickname, pl.photo_url, pl.position
    from public.players pl
    join ids on ids.player_id = pl.id
    where pl.owner_id = v_owner
  )
  select json_build_object(
    'titulo', v_title,
    'peladas', coalesce((
      select json_agg(json_build_object('id', pe.id, 'nome', pe.name, 'data', pe.match_date)
                      order by pe.match_date)
      from peladas pe), '[]'::json),
    'teams', coalesce((
      select json_agg(json_build_object(
               'id', ti.id,
               'match_id', ti.match_id,
               'position', ti.position,
               'color', ti.color,
               'player_ids', coalesce((
                 select json_agg(el.player_id) from elencos el where el.team_id = ti.id
               ), '[]'::json)
             ) order by ti.match_id, ti.position)
      from times ti), '[]'::json),
    'rounds', coalesce((
      select json_agg(json_build_object(
               'id', ro.id,
               'match_id', ro.match_id,
               'sequence', ro.sequence,
               'home_team_id', ro.home_team_id,
               'away_team_id', ro.away_team_id,
               'status', ro.status,
               'result', ro.result,
               'decided_by', ro.decided_by
             ) order by ro.match_id, ro.sequence)
      from rodadas ro), '[]'::json),
    'goals', coalesce((
      select json_agg(json_build_object(
               'id', go.id,
               'round_id', go.round_id,
               'team_id', go.team_id,
               'player_id', go.player_id,
               'assist_player_id', go.assist_player_id,
               'created_at', go.created_at
             ) order by go.created_at)
      from gols go), '[]'::json),
    'borrowed', coalesce((
      select json_agg(json_build_object(
               'round_id', em.round_id,
               'team_id', em.team_id,
               'player_id', em.player_id
             ))
      from emprestados em), '[]'::json),
    'departures', coalesce((
      select json_agg(json_build_object(
               'team_id', sa.team_id,
               'player_id', sa.player_id,
               'from_sequence', sa.from_sequence
             ))
      from saidas sa), '[]'::json),
    'players', coalesce((
      select json_agg(json_build_object(
               'id', jo.id,
               'name', jo.name,
               'nickname', jo.nickname,
               'photo_url', jo.photo_url,
               'position', jo.position
             ) order by jo.name)
      from jogadores jo), '[]'::json)
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.pelada_publica_dados(text, uuid) to anon, authenticated;
