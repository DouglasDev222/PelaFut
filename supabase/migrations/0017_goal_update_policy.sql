-- Editar a autoria de um gol (quem fez / quem assistiu) depois do jogo.
--
-- A tabela tinha policies de select, insert e delete, mas nenhuma de update —
-- então um UPDATE do dono era descartado pela RLS silenciosamente, sem erro.
-- Mesmo padrão de dono usado nas demais policies da tabela.

create policy "match_round_goals_update_own"
  on public.match_round_goals for update
  using (
    exists (
      select 1 from public.match_rounds r
      join public.matches m on m.id = r.match_id
      where r.id = match_round_goals.round_id and m.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.match_rounds r
      join public.matches m on m.id = r.match_id
      where r.id = match_round_goals.round_id and m.owner_id = auth.uid()
    )
  );
