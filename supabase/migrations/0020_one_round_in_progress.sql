-- Impede que uma pelada tenha DUAS partidas "em andamento" ao mesmo tempo — o
-- bug da rodada duplicada (um reenvio por falha de rede criava um segundo
-- Jogo N; um finalizava e o outro ficava preso in_progress).
--
-- O cliente já ganhou uma trava de idempotência, mas isto é a garantia final no
-- banco: no máximo uma rodada in_progress por pelada.

-- 1. Limpa duplicatas que já existam, senão o índice único não pode ser criado.
--    Uma rodada in_progress é considerada fantasma (e removida) quando:
--      a) existe uma rodada finished na MESMA sequence (a que "valeu"), ou
--      b) existe outra in_progress da mesma pelada mais nova (maior sequence,
--         ou mesma sequence e id maior) — mantém-se apenas a mais recente.
--    Gols, empréstimos e pênaltis das rodadas removidas caem por cascade.
delete from public.match_rounds r
where r.status = 'in_progress'
  and (
    exists (
      select 1 from public.match_rounds f
      where f.match_id = r.match_id
        and f.sequence = r.sequence
        and f.status = 'finished'
    )
    or exists (
      select 1 from public.match_rounds o
      where o.match_id = r.match_id
        and o.status = 'in_progress'
        and (o.sequence > r.sequence or (o.sequence = r.sequence and o.id > r.id))
    )
  );

-- 2. A trava definitiva: só uma rodada in_progress por pelada.
create unique index if not exists match_rounds_one_in_progress
  on public.match_rounds (match_id)
  where status = 'in_progress';
