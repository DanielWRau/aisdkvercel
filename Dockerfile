FROM node:22-slim AS base

RUN corepack enable
WORKDIR /app

# Dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Source
COPY . .

# Build (importMap.js is pre-generated and included in source)
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
ENV DATABASE_URL=$DATABASE_URL
ENV NODE_OPTIONS=--max-old-space-size=3072
RUN pnpm build

# Production
FROM node:22-slim AS runner
RUN corepack enable
WORKDIR /app

COPY --from=base /app/.next ./.next
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./
COPY --from=base /app/public ./public
COPY --from=base /app/next.config.ts ./
COPY --from=base /app/src/app/\(payload\)/admin/importMap.js ./src/app/\(payload\)/admin/importMap.js

EXPOSE 3000
CMD ["pnpm", "start"]
