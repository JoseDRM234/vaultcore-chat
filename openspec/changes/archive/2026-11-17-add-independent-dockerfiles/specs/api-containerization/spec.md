# Spec Delta

## Purpose

Defines the standalone container packaging, build isolation, and production startup migration behavior for the VaultCore Chat API service so it can be built and deployed independently.

## ADDED Requirements

### Requirement: Independent multi-stage API image build
The `api` service SHALL provide a standalone `Dockerfile` with a shared `base` stage, a `development` target, and a `production` final stage that builds with `pnpm` without depending on files outside `api/`.

#### Scenario: Production image builds independently
- **WHEN** `docker build` is executed with `api/` as the build context and no target specified
- **THEN** the build produces the `production` image containing only compiled `dist/` artifacts and pruned production `node_modules`

#### Scenario: Development target builds with dev dependencies
- **WHEN** `docker build --target development` is executed with `api/` as the build context
- **THEN** the build produces an image with development dependencies installed and configured to start the API in watch mode on port `4000`

### Requirement: Non-root API production runtime
The `api` production image SHALL run the application process as a dedicated non-root user and expose port `4000`.

#### Scenario: Container process runs as non-root user
- **WHEN** a container is started from the `api` production image
- **THEN** the process executes under the non-root `app` user with `NODE_ENV=production` and port `4000` exposed

### Requirement: Automatic database migrations on production startup
The `api` production container SHALL execute pending database migrations via a compiled runner before starting the HTTP/WebSocket server, without requiring `ts-node` or development dependencies.

#### Scenario: Pending migrations run before API server starts
- **WHEN** the `api` production container starts with valid PostgreSQL connection environment variables
- **THEN** the compiled migration runner applies any pending TypeORM migrations and then starts `dist/main.js`

#### Scenario: Migration failure prevents API server startup
- **WHEN** the migration runner fails due to an unreachable database or invalid migration
- **THEN** the container exits with a non-zero status and does not start `dist/main.js`

### Requirement: API build context exclusions
The `api` directory SHALL include a `.dockerignore` file that excludes local dependencies, build outputs, environment secrets, and editor metadata from the Docker build context.

#### Scenario: Sensitive and generated files are excluded from build context
- **WHEN** Docker builds the `api` image
- **THEN** `node_modules`, `dist`, `.git`, `.env`, `.env.*` (except `.env.example`), `coverage`, and log files are excluded from the build context
