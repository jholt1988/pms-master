# syntax=docker/dockerfile:1.7
# Dockerfile for MIL Service API (pnpm)

# ---- Builder Stage ----
FROM node:20-slim AS builder

WORKDIR /usr/src/app
RUN corepack enable

# Copy package metadata + lock first (better cache)
COPY package.json pnpm-lock.yaml* ./

# Install deps
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm run build

# ---- Production Stage ----
FROM node:20-slim AS runner

WORKDIR /usr/src/app
ENV NODE_ENV=production
RUN corepack enable

# Copy only what runtime needs
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/node_modules ./node_modules

EXPOSE 8080
CMD ["pnpm", "start"]
