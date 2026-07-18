-- Meia estrela na avaliação do peladeiro (3.5, 4.5 ...).
--
-- O tipo era smallint, então só cabia nota inteira. Passa a numeric(2,1) com
-- passo de 0.5. As notas inteiras que já existem continuam válidas — não é
-- preciso migrar dado nenhum.

alter table public.players
  drop constraint if exists players_skill_level_check;

alter table public.players
  alter column skill_level type numeric(2,1) using skill_level::numeric(2,1);

alter table public.players
  add constraint players_skill_level_check
  check (
    skill_level is null
    or (skill_level >= 0.5 and skill_level <= 5 and (skill_level * 2) = trunc(skill_level * 2))
  );
