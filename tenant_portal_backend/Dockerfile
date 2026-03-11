# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY tenant_portal_backend/package.json tenant_portal_backend/package.json
COPY tenant_portal_app/package.json tenant_portal_app/package.json
COPY packages/mil-client/package.json packages/mil-client/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
WORKDIR /app/tenant_portal_backend
# Generate Prisma client from the backend schema before TypeScript compile.
RUN pnpm exec prisma generate --schema=prisma/schema.prisma
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache python3 py3-pip
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/tsconfig.base.json ./
COPY --from=build /app/tenant_portal_backend ./tenant_portal_backend
COPY --from=build /app/packages ./packages
COPY --from=build /app/tools ./tools
WORKDIR /app/tenant_portal_backend
EXPOSE 3001
CMD ["node", "dist/tenant_portal_backend/src/index.js"]
