# Tasks

## 1. API Containerization

- [x] 1.1 Create `api/src/core/database/run-migrations.ts` using `AppDataSource` (`initialize()`, `runMigrations()`, `destroy()`, non-zero exit on error) and verify `pnpm --dir api build` compiles `api/dist/core/database/run-migrations.js` cleanly
- [x] 1.2 Create `api/.dockerignore` excluding `node_modules`, `dist`, `.git`, `.gitignore`, `*.md`, `.env`, `.env.*` (keeping `!.env.example`), `docker-compose*.yml`, `.dockerignore`, `logs`, `*.log`, `coverage`, `.vscode`, and `.idea`
- [x] 1.3 Create `api/Dockerfile` with `base` (`node:24-alpine`, `corepack`/`pnpm`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.npmrc`), `development` (`pnpm install`, `start:dev`), `build` (`pnpm install --frozen-lockfile`, `pnpm build`, `pnpm prune --prod`), and `production` (non-root `app` user, `NODE_ENV=production`, `EXPOSE 4000`, `CMD ["sh", "-c", "node dist/core/database/run-migrations.js && node dist/main.js"]`)
- [x] 1.4 Verify `docker build -t vaultcore-api:prod ./api` and `docker build --target development -t vaultcore-api:dev ./api` succeed (adding Alpine build tools for `bcrypt` only if required) and confirm the production container runs as user `app`

## 2. Frontend Containerization

- [x] 2.1 Create `frontend/.dockerignore` excluding `node_modules`, `dist`, `.git`, `.gitignore`, `*.md`, `.env`, `.env.*` (keeping `!.env.example`), `docker-compose*.yml`, `.dockerignore`, `*.log`, `.vscode`, and `.idea`
- [x] 2.2 Create `frontend/nginx.conf` serving `/usr/share/nginx/html` on port `80` with `try_files $uri $uri/ /index.html`, `Cache-Control: no-store, no-cache, must-revalidate` on `/index.html`, 1-year `immutable` cache on hashed static assets, gzip compression, and security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`)
- [x] 2.3 Create `frontend/Dockerfile` with `base` (`node:24-alpine`, `corepack`/`pnpm`, `package.json`, `pnpm-lock.yaml`), `development` (`EXPOSE 5173`, `CMD ["pnpm", "dev", "--host"]`), `build` (`ARG VITE_API_BASE_URL`, `ARG VITE_WS_URL`, `pnpm install --frozen-lockfile`, `pnpm build`), and `production` (`nginx:stable-alpine`, `nginx.conf`, `/app/dist`, `EXPOSE 80`, `CMD ["nginx", "-g", "daemon off;"]`)
- [x] 2.4 Verify `docker build -t vaultcore-frontend:prod --build-arg VITE_API_BASE_URL=http://localhost:4000/api/v1 --build-arg VITE_WS_URL=http://localhost:4000 ./frontend` and `docker build --target development -t vaultcore-frontend:dev ./frontend` succeed, and confirm SPA fallback and cache headers respond as configured
