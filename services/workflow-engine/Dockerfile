# syntax=docker/dockerfile:1.7

# This Dockerfile must be built from the monorepo root as context:
#   docker build -f services/workflow-engine/Dockerfile .
# NOTE: Build does not require a running database. Prisma generate is
#       handled in the build stage below.

FROM node:22-alpine AS base
WORKDIR /app

RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@8.15.8 --activate

# ---- deps: install all workspace dependencies (frozen lockfile) ----
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY services/workflow-engine/package.json ./services/workflow-engine/package.json
COPY packages/contracts-pos/package.json ./packages/contracts-pos/package.json
COPY packages/crypto/package.json ./packages/crypto/package.json

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---- build: generate prisma client, compile TS, deploy prod tree ----
FROM deps AS build
COPY . .

# Install prisma CLI as a devDep of the workflow-engine.
RUN pnpm add -D prisma@7.8.0 --filter @propertyos/workflow-engine

# Copy the root prisma schema into the workflow-engine's local prisma/
# dir so prisma generate can find it via the default search path and
# resolve @prisma/client from the workflow-engine's node_modules.
WORKDIR /app/services/workflow-engine
RUN mkdir -p prisma && cp ../../prisma/schema.prisma prisma/schema.prisma
ENV DATABASE_URL=postgresql://pms:pms@postgres:5432/pms?schema=public
RUN npx prisma generate
WORKDIR /app

# Build the TypeScript code
RUN pnpm --filter @propertyos/workflow-engine build

# Verify build succeeded
RUN test -f services/workflow-engine/dist/main.js

# Deploy a production-only node_modules tree
RUN pnpm --filter @propertyos/workflow-engine deploy --prod /out

# Save the generated Prisma Client to a deterministic path for the runner stage.
# @prisma/client/default.js requires '.prisma/client/default' which Node
# resolves as a sibling of @prisma/client inside pnpm's virtual store.
RUN PRISMA_CLIENT_DIR=$(find /app/node_modules/.pnpm -path '*/node_modules/.prisma/client' -type d | head -1) && \
    test -n "$PRISMA_CLIENT_DIR" && \
    cp -r "$PRISMA_CLIENT_DIR" /prisma-client

# ---- runner: minimal production image ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3003

RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs
USER nodeuser

COPY --from=build /out ./

# Place the generated Prisma Client where pnpm's virtual store expects it:
# as a sibling of @prisma/client inside the .pnpm directory.
COPY --from=build /prisma-client /tmp/prisma-client
USER root
RUN PRISMA_CLIENT_PKG=$(find /app/node_modules/.pnpm -path '*/node_modules/@prisma/client' -type d | head -1) && \
    test -n "$PRISMA_CLIENT_PKG" && \
    NODE_MODULES_DIR="$(dirname "$(dirname "$PRISMA_CLIENT_PKG")")" && \
    mkdir -p "$NODE_MODULES_DIR/.prisma" && \
    cp -r /tmp/prisma-client "$NODE_MODULES_DIR/.prisma/client" && \
    rm -rf /tmp/prisma-client

USER nodeuser
EXPOSE 3003
CMD ["node", "dist/main.js"]
