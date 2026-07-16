-- Permite o cronômetro sobreviver a um refresh: em vez de contar no cliente,
-- guardamos started_at (já existia) + quanto tempo já ficou pausado, e o
-- cliente recalcula o tempo decorrido a partir do relógio real.
alter table public.match_rounds
  add column paused_at timestamptz,
  add column paused_seconds integer not null default 0;
