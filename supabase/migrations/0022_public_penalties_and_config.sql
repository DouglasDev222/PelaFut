-- RPC público completo: além do tempo das rodadas (0021), envia agora o placar
-- dos pênaltis, a duração regulamentar da pelada (para limitar a média) e o
-- flag "ambos saem no empate" (para o rótulo do histórico).
--
-- É um superconjunto do RPC da 0021 — aplicar esta migração já entrega tudo,
-- mesmo que a 0021 não tenha sido aplicada.
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
    select m.id, m.name, m.match_date, m.match_duration_minutes, m.tie_both_leave_allowed
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
           r.status, r.result, r.decided_by,
           r.started_at, r.finished_at, r.paused_at, r.paused_seconds
    from public.match_rounds r
    join peladas pe on pe.id = r.match_id
    where r.status = 'finished'
  ),
  gols as (
    select g.id, g.round_id, g.team_id, g.player_id, g.assist_player_id, g.created_at
    from public.match_round_goals g
    join rodadas ro on ro.id = g.round_id
  ),
  penaltis as (
    select k.round_id, k.team_id, k.scored
    from public.match_round_penalty_kicks k
    join rodadas ro on ro.id = k.round_id
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
    select pl.id, pl.name, pl.nickname, pl.photo_url, pl.position
    from public.players pl
    join ids on ids.player_id = pl.id
    where pl.owner_id = v_owner
  )
  select json_build_object(
    'titulo', v_title,
    'peladas', coalesce((
      select json_agg(json_build_object(
               'id', pe.id, 'nome', pe.name, 'data', pe.match_date,
               'duration_minutes', pe.match_duration_minutes,
               'tie_both_leave_allowed', pe.tie_both_leave_allowed
             ) order by pe.match_date)
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
               'decided_by', ro.decided_by,
               'started_at', ro.started_at,
               'finished_at', ro.finished_at,
               'paused_at', ro.paused_at,
               'paused_seconds', ro.paused_seconds
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
    'penalties', coalesce((
      select json_agg(json_build_object(
               'round_id', pk.round_id,
               'team_id', pk.team_id,
               'scored', pk.scored
             ))
      from penaltis pk), '[]'::json),
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
