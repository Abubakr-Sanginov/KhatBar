# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app

# --- deps ---------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- builder ------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://khatbar:khatbar@db:5432/khatbar"
RUN npx prisma generate
RUN npm run build

# --- runtime ------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
EXPOSE 3000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/next.config.* ./
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# apply the schema on boot (idempotent) then start the custom server
CMD ["sh", "-c", "npx prisma db push --skip-generate && node_modules/.bin/tsx server.ts"]
