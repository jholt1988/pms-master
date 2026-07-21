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
# Copy all node_modules from deps (already has @prisma/client and everything needed)
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
ENV DATABASE_URL=postgresql://pms:pms@postgres:5432/pms?schema=public
ENV ALLOW_NO_DB=true

# Generate Prisma Client using pnpm (which has deps installed in node_modules)
RUN set -e && \
    mv prisma.config.ts prisma.config.ts.skip 2>/dev/null || true && \
    (pnpm exec prisma generate --schema=./prisma/schema.prisma || echo "Note: prisma generate had issues") && \
    mv prisma.config.ts.skip prisma.config.ts 2>/dev/null || true && \
    true

# Save generated Prisma Client to a well-known path for the runner stage.
# The .prisma/client directory lives inside pnpm's virtual store.
RUN mkdir -p /prisma-generated/client && \
    PRISMA_CLIENT_PKG=$(find /app/node_modules -path '*/.prisma/client' -type d | head -1) && \
    test -n "$PRISMA_CLIENT_PKG" && \
    cp -r "$PRISMA_CLIENT_PKG"/* /prisma-generated/client/ || echo "WARNING: Prisma client not found in node_modules"

# Build the TypeScript code
RUN pnpm build

# Verify build succeeded
RUN test -f dist/tenant_portal_backend/src/index.js

FROM node:22-alpine AS runner
WORKDIR /app
ARG NODE_ENV=production

ENV NODE_ENV=$NODE_ENV \
    NODE_OPTIONS="--max-old-space-size=512"

RUN corepack enable && corepack prepare pnpm@8.15.8 --activate \
    && npm install -g prisma@6.19.2 \
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

# Copy built application
COPY --from=build /app/packages/mil-client ./packages/mil-client 2>/dev/null || true
COPY --from=build /app/tenant_portal_backend/prisma ./tenant_portal_backend/prisma
COPY --from=build /app/tenant_portal_backend/dist ./tenant_portal_backend/dist
COPY --from=build /prisma-generated/client /app/tenant_portal_backend/node_modules/.prisma/client

WORKDIR /app/tenant_portal_backend
RUN mkdir -p logs uploads && chown -R nodeuser:nodejs logs uploads

USER nodeuser
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "--enable-source-maps", "dist/tenant_portal_backend/src/index.js"]
