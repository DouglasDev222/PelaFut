-- win_stays não correspondia a nenhuma regra configurável real: o sistema de
-- rodízio (Fase 5) sempre assume "quem ganha fica, quem perde sai" como
-- mecânica fixa. A única variação de fato configurável é o empate.
alter table public.matches drop column win_stays;
