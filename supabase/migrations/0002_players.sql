create table public.players (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  nickname text,
  photo_url text,
  active boolean not null default true,
  birth_date date,
  position text not null default 'jogador' check (position in ('jogador', 'goleiro')),
  skill_level smallint check (skill_level between 1 and 5),
  shirt_number smallint,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index players_owner_id_idx on public.players (owner_id);

alter table public.players enable row level security;

create policy "players_select_own"
  on public.players for select
  using (owner_id = auth.uid());

create policy "players_insert_own"
  on public.players for insert
  with check (owner_id = auth.uid());

create policy "players_update_own"
  on public.players for update
  using (owner_id = auth.uid());

create policy "players_delete_own"
  on public.players for delete
  using (owner_id = auth.uid());

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger players_set_updated_at
  before update on public.players
  for each row execute function public.set_updated_at();
