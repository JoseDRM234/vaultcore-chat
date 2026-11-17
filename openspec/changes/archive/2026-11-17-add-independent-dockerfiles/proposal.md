# Proposal

## Why

The `api` and `frontend` applications currently have no containerization definitions, preventing them from being built and deployed as independent, reproducible services. Providing standalone multi-stage Dockerfiles for each project enables separate CI/CD builds and isolated deployments without coupling them to a shared orchestration file.

## What Changes

- Add an independent multi-stage `Dockerfile` and `.dockerignore` in `api/` targeting `node:24-alpine` with `pnpm`, non-root production execution, and automatic TypeORM migration execution before starting the API server.
- Add a compiled TypeORM migration runner script (`api/src/core/database/run-migrations.ts`) so production containers can run pending migrations without `ts-node` or `devDependencies`.
- Add an independent multi-stage `Dockerfile`, `.dockerignore`, and SPA `nginx.conf` in `frontend/` targeting `node:24-alpine` for build/dev and `nginx:stable-alpine` for production static serving with build-time `VITE_*` arguments.
- Explicitly exclude `docker-compose.yml` from scope; each service is packaged to be built and run independently.

## Capabilities

### New Capabilities
- `api-containerization`: Standalone multi-stage Docker build, `.dockerignore`, and production startup migration execution for the NestJS API service.
- `frontend-containerization`: Standalone multi-stage Docker build, `.dockerignore`, and nginx SPA serving configuration for the React + Vite frontend service.

### Modified Capabilities
<!-- None: no existing specs in openspec/specs/ are affected. -->

## Impact

- **API (`api/`)**: New `Dockerfile`, `.dockerignore`, and `src/core/database/run-migrations.ts`; `dist/` build output will include `dist/core/database/run-migrations.js`.
- **Frontend (`frontend/`)**: New `Dockerfile`, `.dockerignore`, and `nginx.conf`; standardized on `pnpm-lock.yaml` for container builds.
- **Dependencies/Runtime**: No runtime application logic or database schema changes; `api` production image requires PostgreSQL connection environment variables and `frontend` build requires `VITE_API_BASE_URL` and `VITE_WS_URL` build args when targeting non-localhost endpoints.
