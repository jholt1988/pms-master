# syntax=docker/dockerfile:1.7

# This Dockerfile must be built from the monorepo root as context:
#   docker build -f tenant_portal_backend/Dockerfile .
# NOTE: Build does not require a running database. Migrations are handled separately
#       via the backend-migrate service in docker-compose.yml

FROM node:22-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@8.15.8

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
ENV DATABASE_URL=postgresql://pms:pms@postgres:5432/pms?schema=public
ENV ALLOW_NO_DB=true
RUN pnpm add -D prisma@6.19.2 && npx prisma generate

# Save generated Prisma Client to a well-known path for the runner stage.
# The .prisma/client directory lives next to the @prisma/client package inside pnpm's node_modules.
RUN mkdir -p /prisma-generated && \
    PRISMA_CLIENT_PKG=$(find /app/node_modules/.pnpm -path '*/node_modules/.prisma/client' -type d | head -1) && \
    cp -r "$PRISMA_CLIENT_PKG" /prisma-generated/client

RUN pnpm build
RUN test -f dist/tenant_portal_backend/src/index.js

FROM node:22-alpine AS runner
WORKDIR /app
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
RUN npm install -g pnpm@8.15.8 prisma@6.19.2 \
    && addgroup -S nodejs \
    && adduser -S nodeuser -G nodejs

# Re-install in the runtime image so pnpm's store-backed symlinks resolve.
# Copy only the manifests needed for a filtered, production-only install.
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=build /app/tenant_portal_backend/package.json ./tenant_portal_backend/package.json
COPY --from=build /app/packages/mil-client/package.json ./packages/mil-client/package.json
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter tenant_portal_backend...

COPY --from=build /app/packages/mil-client ./packages/mil-client
COPY --from=build /app/tenant_portal_backend/prisma ./tenant_portal_backend/prisma
COPY --from=build /app/tenant_portal_backend/dist ./tenant_portal_backend/dist

# Copy the pre-generated Prisma Client engine from the build stage and place it
# where @prisma/client expects to find '.prisma/client' via Node module resolution.
# The require('.prisma/client/default') resolves relative to the pnpm virtual store's
# node_modules directory, so .prisma must be a sibling of @prisma, not inside it.
COPY --from=build /prisma-generated /tmp/prisma-generated
RUN TARGET=$(find /app/node_modules/.pnpm -path '*/node_modules/@prisma/client' -type d | head -1) \
    && NODE_MODULES_DIR="$(echo "$TARGET" | sed 's|/node_modules/@prisma/client$|/node_modules|')" \
    && mkdir -p "$NODE_MODULES_DIR/.prisma" \
    && cp -r /tmp/prisma-generated/client "$NODE_MODULES_DIR/.prisma/client" \
    && rm -rf /tmp/prisma-generated

WORKDIR /app/tenant_portal_backend
RUN mkdir -p logs && chown -R nodeuser:nodejs logs
RUN mkdir -p /app/tenant_portal_backend/uploads && \
    chown -R nodeuser:nodejs /app/tenant_portal_backend

USER nodeuser
EXPOSE 3001
CMD ["node", "dist/tenant_portal_backend/src/index.js"]
