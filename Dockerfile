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
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

# run as non-root (mirrors the official nextjs Docker example)
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# production-only deps are enough: tsx, socket.io, prisma, next are all in dependencies
COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/next.config.* ./

RUN chown -R nextjs:nodejs /app
USER nextjs

# apply the schema on boot (idempotent) then start the custom server
CMD ["sh", "-c", "if [ -n \"$DATABASE_URL\" ]; then npx prisma db push; fi && node_modules/.bin/tsx server.ts"]
