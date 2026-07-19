-- "Voltar para o jogo anterior" (undo the last round finalization) was kept
-- only in the live hook's memory, so leaving the page or refreshing lost the
-- ability — the button vanished. This column persists the single most-recent
-- undo snapshot (the finished round to reopen, the round to delete, and every
-- team's queue position before the rotation) so it survives a reload.
--
-- It holds at most one snapshot: overwritten on each round finalization, and
-- cleared (set null) once undone or once a manual queue edit invalidates it.
alter table public.matches add column last_round_undo jsonb;
