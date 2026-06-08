FROM node:20-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/utils/package.json ./packages/utils/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @arbitex/types build 2>/dev/null || true
RUN pnpm --filter @arbitex/config build 2>/dev/null || true
RUN pnpm --filter @arbitex/utils build 2>/dev/null || true
RUN pnpm --filter @arbitex/api build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./package.json
EXPOSE 4000
CMD ["node", "dist/index.js"]
