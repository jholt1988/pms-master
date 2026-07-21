# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
WORKDIR /app

RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@8.15.8 --activate

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY services/workflow-engine/package.json ./services/workflow-engine/package.json
COPY packages/contracts-pos/package.json ./packages/contracts-pos/package.json
COPY packages/crypto/package.json ./packages/crypto/package.json

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @propertyos/workflow-engine build
RUN pnpm --filter @propertyos/workflow-engine deploy --prod /out

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3003

RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs
USER nodeuser

COPY --from=build /out ./
EXPOSE 3003
CMD ["node", "dist/main.js"]
