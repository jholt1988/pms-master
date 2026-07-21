# syntax=docker/dockerfile:1.7

# This Dockerfile must be built from the monorepo root as context:
#   docker build -f tenant_portal_backend/Dockerfile .
# NOTE: Build does not require a running database. Migrations are handled separately
#       via the backend-migrate service in docker-compose.yml

FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8.15.8 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY tenant_portal_backend/package.json tenant_portal_backend/package.json
COPY packages/mil-client/package.json packages/mil-client/package.json
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter tenant_portal_backend...

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=deps /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=deps /app/tenant_portal_backend/package.json ./tenant_portal_backend/package.json
COPY --from=deps /app/packages/mil-client/package.json ./packages/mil-client/package.json
COPY tenant_portal_backend ./tenant_portal_backend
COPY packages/mil-client ./packages/mil-client

WORKDIR /app/tenant_portal_backend
ENV DATABASE_URL=postgresql://pms:***@postgres:5432/pms?schema=public
ENV ALLOW_NO_DB=true

# Install prisma CLI locally so it's available in this stage's PATH.
RUN pnpm add -D prisma@7.8.0 --filter tenant_portal_backend

# Generate Prisma Client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build the TypeScript code
RUN pnpm build

# Verify build succeeded
RUN test -f dist/tenant_portal_backend/src/index.js

# Save the generated Prisma Client to a deterministic path for the runner stage.
# @prisma/client/default.js does require('.prisma/client/default') which Node
# resolves as a sibling of @prisma/client inside pnpm's virtual store.
# We copy it out to /prisma-client so the runner stage can place it back.
RUN PRISMA_CLIENT_DIR=$(find /app/node_modules/.pnpm -path '*/node_modules/.prisma/client' -type d | head -1) && \
    test -n "$PRISMA_CLIENT_DIR" && \
    cp -r "$PRISMA_CLIENT_DIR" /prisma-client

FROM node:22-alpine AS runner
WORKDIR /app
ARG NODE_ENV=production

ENV NODE_ENV=$NODE_ENV \
    NODE_OPTIONS="--max-old-space-size=512"

RUN corepack enable && corepack prepare pnpm@8.15.8 --activate \
    && npm install -g prisma@7.8.0 \
    && addgroup -S nodejs \
    && adduser -S nodeuser -G nodejs

# Re-install dependencies for production
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=build /app/tenant_portal_backend/package.json ./tenant_portal_backend/package.json
COPY --from=build /app/packages/mil-client/package.json ./packages/mil-client/package.json
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter tenant_portal_backend...

# Place the generated Prisma Client where pnpm's virtual store expects it:
# as a sibling of @prisma/client inside the .pnpm directory.
# The exact hash path varies by lockfile, so we find it dynamically.
COPY --from=build /prisma-client /tmp/prisma-client
RUN PRISMA_CLIENT_PARENT=$(find /app/node_modules/.pnpm -path '*/node_modules/@prisma/client' -type d | head -1) && \
    test -n "$PRISMA_CLIENT_PARENT" && \
    NODE_MODULES_DIR="$(dirname "$PRISMA_CLIENT_PARENT")" && \
    mkdir -p "$NODE_MODULES_DIR/.prisma" && \
    cp -r /tmp/prisma-client "$NODE_MODULES_DIR/.prisma/client" && \
    rm -rf /tmp/prisma-client

# Copy built application
COPY --from=build /app/tenant_portal_backend/prisma ./tenant_portal_backend/prisma
COPY --from=build /app/tenant_portal_backend/prisma.config.ts ./tenant_portal_backend/prisma.config.ts
COPY --from=build /app/tenant_portal_backend/dist ./tenant_portal_backend/dist

WORKDIR /app/tenant_portal_backend
RUN mkdir -p logs uploads && chown -R nodeuser:nodejs logs uploads

USER nodeuser
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "--enable-source-maps", "dist/tenant_portal_backend/src/index.js"]
