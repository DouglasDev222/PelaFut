-- Página pública de estatísticas.
--
-- Acesso anônimo NÃO é feito com policies novas nas tabelas: RLS é por linha,
-- não por coluna, então liberar `players` para o anon exporia birth_date,
-- notes e skill_level junto. Em vez disso, tudo passa por funções
-- `security definer` que devolvem apenas as colunas permitidas. O papel `anon`
-- continua sem SELECT em nenhuma tabela base.

-- `unique` já cria o índice usado na busca por código; não precisa de outro.
alter table public.profiles
  add column public_code text unique,
  add column public_stats_enabled boolean not null default false,
  add column public_title text;

-- Gera (ou regenera) o código público do usuário logado. Fica no servidor para
-- garantir unicidade e não deixar o cliente escolher o código.
-- Requer pgcrypto (padrão no Supabase, no schema `extensions`).
create or replace function public.gerar_codigo_publico()
returns text
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;

  loop
    v_code := encode(gen_random_bytes(4), 'hex');
    exit when not exists (select 1 from public.profiles p where p.public_code = v_code);
  end loop;

  update public.profiles set public_code = v_code where id = auth.uid();
  return v_code;
end;
$$;

-- Home pública: título + peladas finalizadas com um resumo de cada uma.
create or replace function public.pelada_publica_resumo(codigo text)
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

  -- Código inexistente e página desativada devolvem a mesma coisa, para não
  -- confirmar se um código existe.
  if v_owner is null then
    return null;
  end if;

  select json_build_object(
    'titulo', v_title,
    'peladas', coalesce((
      select json_agg(json_build_object(
               'id', x.id,
               'nome', x.nome,
               'data', x.data,
               'local', x.local,
               'jogos', x.jogos,
               'gols', x.gols
             ) order by x.data desc)
      from (
        select
          m.id,
          m.name as nome,
          m.match_date as data,
          m.location as local,
          (select count(*) from public.match_rounds r
            where r.match_id = m.id and r.status = 'finished') as jogos,
          (select count(*) from public.match_round_goals g
             join public.match_rounds r2 on r2.id = g.round_id
            where r2.match_id = m.id and r2.status = 'finished') as gols
        from public.matches m
        where m.owner_id = v_owner and m.status = 'finished'
      ) x
    ), '[]'::json)
  ) into v_result;

  return v_result;
end;
$$;

-- Dados brutos para as telas públicas (geral, pelada e jogador).
-- `jogo_id` nulo = todas as peladas finalizadas; preenchido = só aquela.
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

-- Só as duas funções de leitura ficam abertas ao anon.
revoke execute on function public.gerar_codigo_publico() from public;
revoke execute on function public.pelada_publica_resumo(text) from public;
revoke execute on function public.pelada_publica_dados(text, uuid) from public;

-- O Supabase concede execute a anon/authenticated por default privileges, e o
-- revoke de PUBLIC acima não desfaz esse grant nominal. Gerar código é ação de
-- dono, então tira explicitamente do anon (a função já barra por dentro com
-- auth.uid(), isto aqui é a segunda tranca).
revoke execute on function public.gerar_codigo_publico() from anon;

grant execute on function public.gerar_codigo_publico() to authenticated;
grant execute on function public.pelada_publica_resumo(text) to anon, authenticated;
grant execute on function public.pelada_publica_dados(text, uuid) to anon, authenticated;
