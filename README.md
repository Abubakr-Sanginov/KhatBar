# KhatBar

KhatBar is a high-load messenger starter built with:

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- SSE-ready realtime hooks
- WebRTC-ready voice room UI stubs
- Optional admin + encryption extensions

## Included features

- Auth stub + profile surface
- Conversation sidebar
- Virtualized message list
- Optimistic message composer
- GIF / emoji / sticker / mic affordances
- Cursor-ready backend service layer
- High-load Prisma schema with denormalized counters
- Read/unread route
- Realtime SSE route
- Voice room token route

## Run locally

```bash
cp .env.example .env
pnpm install
pnpm prisma generate
pnpm prisma migrate dev --name init_khatbar
pnpm prisma db seed
pnpm dev
```

## Notes

- Without a configured database, the app falls back to mock chat bootstrap data.
- Replace `lib/auth.ts` with a real auth provider.
- Replace the SSE demo flow with a real pub/sub layer.
- Replace the demo voice token route with real SFU signaling.
- This repository was reconstructed from the ClickUp handoff docs and organized into runnable project files.
