# Deploy (frontend estático via Docker)

O app é uma SPA estática que fala direto com o Supabase. O deploy é apenas
servir a pasta `frontend/dist` (já buildada) com nginx, dentro de um container.

## Como atualizar / subir

1. Buildar o frontend na máquina de desenvolvimento:
   ```
   pnpm --filter frontend build
   ```
2. Copiar `frontend/dist` para dentro desta pasta `deploy/` (ao lado do
   `docker-compose.yml` e do `nginx.conf`), de forma que fique `deploy/dist/`.
3. Na VPS, dentro desta pasta:
   ```
   docker compose up -d        # primeira vez
   docker compose restart      # ao trocar o dist
   ```

O container `pelafut` sobe o nginx servindo o `dist`, publicado na porta
`8090` do host (`http://IP_DA_VPS:8090`). O `nginx.conf` já tem o fallback de
SPA (`try_files ... /index.html`) para o React Router funcionar em refresh/URL
direta.

Para trocar a porta, edite `ports:` no `docker-compose.yml`.
