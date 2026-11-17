# ── base — imagen compartida con pnpm ──
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /usr/src/app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# ── development ──
FROM base AS development
RUN pnpm install
COPY . .
EXPOSE 4000
CMD ["pnpm", "run", "start:dev"]

# ── build ──
FROM base AS build
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
RUN pnpm prune --prod

# ── production ──
FROM node:24-alpine AS production
WORKDIR /usr/src/app
ENV NODE_ENV=production

RUN addgroup -S app && adduser -S app -G app

COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist

EXPOSE 4000

USER app

CMD ["sh", "-c", "node dist/core/database/run-migrations.js && node dist/main.js"]
