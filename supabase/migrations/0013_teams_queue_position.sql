-- `teams.position` is the team's permanent identity (Time 1, 2, 3...), assigned
-- once during formation and never touched again. The live-match rotation was
-- wrongly reusing that same column for the live queue order, which made teams
-- visibly "swap" names/players every time someone rotated out — the team
-- *label* (derived from sorted position) pointed at a different team each
-- time. `queue_position` is a separate, independent field for that.
alter table public.teams add column queue_position smallint;
