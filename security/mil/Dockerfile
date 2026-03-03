# Dockerfile for MIL Service API

# ---- Builder Stage ----
FROM node:20-slim AS builder

WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code and build
COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:20-slim

WORKDIR /usr/src/app

# Copy built code and dependencies from builder stage
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package.json .

# Expose port and define command
EXPOSE 8080
CMD ["npm", "start"]
