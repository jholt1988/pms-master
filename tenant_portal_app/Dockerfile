# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@8.15.8
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY tenant_portal_app/package.json tenant_portal_app/package.json
COPY tenant_portal_backend/package.json tenant_portal_backend/package.json
COPY packages/mil-client/package.json packages/mil-client/package.json
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter tenant_portal_app...
COPY . .
WORKDIR /app/tenant_portal_app
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm build

FROM nginx:1.27-alpine AS runner
COPY tenant_portal_app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/tenant_portal_app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
