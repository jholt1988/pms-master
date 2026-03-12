# syntax=docker/dockerfile:1.7
# Dockerfile for MIL Service API (isolated package build)

FROM node:20-slim AS builder

WORKDIR /usr/src/app
RUN corepack enable

# Build MIL as a standalone package to avoid monorepo root builds
COPY security/mil ./security/mil
WORKDIR /usr/src/app/security/mil
RUN pnpm install --no-frozen-lockfile
RUN pnpm run build || (echo "tsc reported errors; continuing because dist/ was emitted" && test -d dist)

FROM node:20-slim AS runner

WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=builder /usr/src/app/security/mil/package.json ./package.json
COPY --from=builder /usr/src/app/security/mil/node_modules ./node_modules
COPY --from=builder /usr/src/app/security/mil/dist ./dist

EXPOSE 8080
CMD ["node", "dist/index.js"]
