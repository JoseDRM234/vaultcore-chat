# frontend-containerization Specification

## Purpose

Defines the standalone container packaging, build-time environment configuration, and nginx SPA serving behavior for the VaultCore Chat frontend service so it can be built and deployed independently.

## Requirements

### Requirement: Independent multi-stage frontend image build
The `frontend` service SHALL provide a standalone `Dockerfile` with a shared `base` stage, a `development` target, and a `production` final stage that builds with `pnpm` without depending on files outside `frontend/`.

#### Scenario: Production image builds independently
- **WHEN** `docker build` is executed with `frontend/` as the build context and no target specified
- **THEN** the build produces an `nginx:stable-alpine` image containing the compiled static bundle and custom `nginx.conf`

#### Scenario: Development target serves Vite dev server on all interfaces
- **WHEN** `docker build --target development` is executed with `frontend/` as the build context
- **THEN** the resulting image exposes port `5173` and starts Vite with `--host` so it accepts connections from outside the container

### Requirement: Build-time API and WebSocket URL injection
The `frontend` `Dockerfile` SHALL accept `VITE_API_BASE_URL` and `VITE_WS_URL` as `ARG` parameters in the `build` stage so Vite embeds them into the compiled static bundle.

#### Scenario: Custom API and WebSocket URLs are embedded at build time
- **WHEN** `docker build --build-arg VITE_API_BASE_URL=https://api.example.com/api/v1 --build-arg VITE_WS_URL=https://api.example.com` is executed
- **THEN** the compiled static bundle targets those endpoints without requiring runtime Node environment variables

### Requirement: SPA routing and caching via nginx
The `frontend` production image SHALL serve static files on port `80` using a custom `nginx.conf` that supports client-side routing, disables caching for `index.html`, caches hashed assets aggressively, and sets security headers without proxying API traffic.

#### Scenario: Deep-linked SPA route resolves on page refresh
- **WHEN** a client requests a client-side route directly from the `frontend` production container
- **THEN** nginx falls back to `/index.html` with HTTP 200 so `react-router-dom` handles the route

#### Scenario: HTML entrypoint is not cached while hashed assets are cached
- **WHEN** a client fetches `/index.html` and a hashed `.js` or `.css` asset
- **THEN** `/index.html` returns `Cache-Control: no-store, no-cache, must-revalidate` and hashed assets return a 1-year immutable cache header

### Requirement: Frontend build context exclusions
The `frontend` directory SHALL include a `.dockerignore` file that excludes local dependencies, build outputs, environment files, and editor metadata from the Docker build context.

#### Scenario: Local artifacts and secrets are excluded from build context
- **WHEN** Docker builds the `frontend` image
- **THEN** `node_modules`, `dist`, `.git`, `.env`, `.env.*` (except `.env.example`), and log files are excluded from the build context
