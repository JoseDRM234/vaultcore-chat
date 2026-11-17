# Design

## Context

See [proposal.md](proposal.md) for motivation and scope. Key codebase constraints observed in `api/` and `frontend/`:

- **API (`api/`)**: NestJS 11 + TypeORM + Socket.IO listening on `process.env.PORT || 4000` (`api/src/main.ts`), using `pnpm` with `pnpm-workspace.yaml` (`allowBuilds` for `bcrypt` and `@parcel/watcher`) and `.npmrc` (`only-built-dependencies=*`). TypeORM has `synchronize: false` (`api/src/app.module.ts`, `api/src/core/database/data-source.ts`), and the current `migration:run` script relies on `typeorm-ts-node-commonjs` (`devDependencies`).
- **Frontend (`frontend/`)**: React 19 + Vite 8 + React Router + `socket.io-client`. Both `pnpm-lock.yaml` and `package-lock.json` exist in `frontend/`. Client endpoints are read at build time from `VITE_API_BASE_URL` (`frontend/src/services/api-client.js`) and `VITE_WS_URL` (`frontend/src/context/SocketContext.jsx`).

## Goals / Non-Goals

**Goals:**
- Provide self-contained multi-stage Dockerfiles (`base` -> `development` | `build` -> `production`) in `api/` and `frontend/` so each service builds from its own directory context.
- Keep `production` as the final stage (default target for `docker build`) while retaining `development` for `--target development` workflows.
- Run TypeORM migrations automatically on `api` container startup without keeping `devDependencies` or `src/` in the production image.
- Serve the compiled `frontend` SPA via `nginx:stable-alpine` with proper SPA fallback, cache headers, gzip, and security headers.

**Non-Goals:**
- Creating `docker-compose.yml` or `docker-compose.prod.yml` (explicitly excluded by the user).
- Adding a reverse proxy (`proxy_pass`) in `nginx.conf`; the frontend connects directly to the API and WebSocket URLs via CORS.
- Modifying `frontend/package-lock.json` or application business logic.

## Decisions

### 1. Compiled migration runner (`api/src/core/database/run-migrations.ts`)
- **Decision**: Add `run-migrations.ts` importing `AppDataSource` from `./data-source`, calling `initialize()`, `runMigrations()`, and `destroy()`, and exiting non-zero on error. Run `node dist/core/database/run-migrations.js && node dist/main.js` as the production `CMD`.
- **Alternatives considered**:
  - *Keep `CMD ["node", "dist/main.js"]` without migrations*: Requires an external migration step on every deploy.
  - *Enable `migrationsRun: true` in `AppModule`*: Couples migration execution to NestJS bootstrap even outside Docker.
- **Rationale**: Matches the `nest build` compilation pipeline, keeps `pnpm prune --prod` intact (no `ts-node`), and fails fast before starting the server if migrations fail. Note that `data-source.ts` calls `dotenv.config()` optionally—when `.env` is absent in the container, `process.env` injected at runtime takes precedence.

### 2. API base image, port, and workspace files
- **Decision**: Use `node:24-alpine` with `corepack enable && corepack prepare pnpm@latest --activate`, copy `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and `.npmrc` in `base`, expose port `4000` (matching `api/src/main.ts` and `api/.env.example`), and run as non-root user `app` in `production`.
- **Alternatives considered**: Exposing port `3000`. Rejected because `api/src/main.ts` defaults to `4000`.

### 3. Frontend package manager and nginx configuration
- **Decision**: Standardize `frontend/Dockerfile` on `pnpm` (`COPY package.json pnpm-lock.yaml ./`, `pnpm install --frozen-lockfile` in `build`). Pass `VITE_API_BASE_URL` and `VITE_WS_URL` as `ARG` + `ENV` in the `build` stage. Serve `/usr/share/nginx/html` with `nginx:stable-alpine` and a custom `frontend/nginx.conf` (`try_files $uri $uri/ /index.html`, `no-store` on `/index.html`, `1y` immutable cache on hashed assets, gzip, and security headers).
- **Alternatives considered**: Using `npm ci` with `package-lock.json` or serving via `vite preview`. Rejected to keep tooling consistent with `api/` (`pnpm`) and avoid running Node in production for static files.

## Risks / Trade-offs

- **[Native `bcrypt` compilation on `node:24-alpine` (`musl`)]** -> If `bcrypt` v6 lacks a prebuilt `musl` binary for the target architecture, `pnpm install` will need `python3 make g++` in the `base` or `build` stage (and in `development`). Verify with `docker build` during implementation and add `apk add --no-cache python3 make g++` only if needed.
- **[Dual lockfiles in `frontend/`]** -> `frontend/` has both `pnpm-lock.yaml` and `package-lock.json`. If dependencies are later updated with `npm` instead of `pnpm`, `pnpm install --frozen-lockfile` in Docker will fail until `pnpm-lock.yaml` is updated. Document/use `pnpm` consistently.
- **[`data-source.ts` `dotenv.config` path in `dist/`]** -> In `dist/core/database/data-source.js`, `path.resolve(__dirname, '../../../.env')` points to `/usr/src/.env` if `dist/` is at `/usr/src/app/dist/` (`../../../` from `dist/core/database` is `/usr/src/app/.env`). In Docker production, no `.env` file is copied; `dotenv.config` silently no-ops when the file is missing and `process.env` values passed to the container are used.
