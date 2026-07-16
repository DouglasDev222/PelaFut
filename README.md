# PelaFut

Sistema para organizar peladas: cadastro de jogadores, formação de times e rodízio automático sincronizado em tempo real.

## Stack

- Frontend: React + Vite + TypeScript, Tailwind CSS + shadcn/ui
- Backend: Node.js + Express + TypeScript
- Banco: Supabase (PostgreSQL), Auth, Storage e Realtime

## Estrutura

- `frontend/` — aplicação web
- `backend/` — API Express (máquina de estados do rodízio, estatísticas, ranking)
- `packages/shared/` — tipos e schemas compartilhados
- `supabase/` — migrations SQL e config do Supabase CLI

## Desenvolvimento

```bash
pnpm install
pnpm dev
```

Copie `.env.example` para `frontend/.env` e `backend/.env` preenchendo as credenciais do seu projeto Supabase.
