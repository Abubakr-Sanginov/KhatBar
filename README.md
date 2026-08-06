<div align="center">

# KhatBar

**End-to-end encrypted messenger for the web and mobile, on one shared backend.**

Real-time messaging, voice and video calls, screen sharing, public and private groups,
channels, and a device-to-device mode that works with no server at all.

[![License: MIT](https://img.shields.io/badge/License-MIT-e8703a?style=for-the-badge)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=for-the-badge)](./CONTRIBUTING.md)
[![Issues](https://img.shields.io/github/issues/Abubakr-Sanginov/KhatBar?style=for-the-badge)](https://github.com/Abubakr-Sanginov/KhatBar/issues)
[![Stars](https://img.shields.io/github/stars/Abubakr-Sanginov/KhatBar?style=for-the-badge)](https://github.com/Abubakr-Sanginov/KhatBar/stargazers)

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Expo](https://img.shields.io/badge/Expo_SDK_57-000020?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native_0.86-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)

[Live Demo](https://khatbar.onrender.com) &middot;
[Report Bug](https://github.com/Abubakr-Sanginov/KhatBar/issues/new?labels=bug) &middot;
[Request Feature](https://github.com/Abubakr-Sanginov/KhatBar/issues/new?labels=enhancement)

</div>

---

## Live Demo

**Web:** [https://khatbar.onrender.com](https://khatbar.onrender.com)

**Mobile:** Set `EXPO_PUBLIC_API_URL=https://khatbar.onrender.com` in `mobile/.env` and run `npx expo start`.

> **Note:** Render's free tier spins down after 15 minutes of inactivity. The first request after spin-down takes ~30 seconds (cold start).

---

## Features

### Messaging
- One-to-one private chats, groups and broadcast channels
- Public and private groups with usernames (`@public_group`) and invite links
- Rich media: images, video, GIFs, stickers, voice messages, files
- Replies, editing, pinning, deletion, read receipts, typing indicators
- Message search, unread badges, last-seen and online presence
- End-to-end encryption (ECDH P-256, HKDF, AES-256-GCM) for private chats and
  closed groups; keys never leave the device
- Local chats: device-to-device messaging with zero server involvement
  (see [Local chat](#local-chat-offline-and-end-to-end-encrypted))

### Calls
- Audio and video calls, group mesh calls
- Screen sharing, microphone and camera toggles mid-call
- Incoming and outgoing ringing, call timer, minimized call bar
- WebRTC mesh with perfect negotiation, STUN and TURN support

### Communities
- Channels with linked public groups (two-way binding)
- Roles: owner, admin, moderator, member
- Admin panel for users, chats, messages and report moderation

### Interfaces
- Two built-in interfaces: **Aurora** (default, neutral surfaces + violet accent) and **Ember** (dark-first "warm signal": ink surfaces, copper accent)
- Switch any time from Settings - the choice is stored per device and applied before the first paint
- Light, dark and system appearance are independent of the interface choice

---

## Architecture

```
+-----------------------------+      +------------------------------+
|         Web client          |      |     Mobile client (Expo)     |
|  Next.js 16 + React 19      |      |  React Native 0.86, SDK 57   |
|  Tailwind v4 + shadcn/ui    |      |  React Navigation, Zustand   |
|  WebRTC (browser media)     |      |  react-native-webrtc         |
|  WebCrypto (E2EE)           |      |  react-native-quick-crypto   |
+--------------+--------------+      +---------------+--------------+
               |   HTTP REST (session cookie)        |
               |   WebSocket (Socket.IO, :3000)      |
               +-------------------------------------+
        +--------------------------------------------+
        |         Custom Node server (server.ts)     |
        |  Next.js API routes + Socket.IO signaling  |
        +----------------------+---------------------+
                               |
                               v
                     +-----------------------+
                     |  PostgreSQL           |
                     |  Prisma 7 ORM         |
                     +-----------------------+
```

- **One shared backend:** both clients speak the same REST API and Socket.IO events.
- **WebRTC mesh:** signaling goes through the server; media flows directly between clients.
- **Wire-compatible E2EE:** a web user and a mobile user can talk in the same encrypted chat.

---

## Getting Started

### Option 1: Docker (fastest)

```bash
git clone https://github.com/Abubakr-Sanginov/KhatBar.git
cd KhatBar
docker compose up -d --build
```

Open http://localhost:3000, register an account and start chatting.

### Option 2: Manual setup

**Prerequisites:** Node.js 22.13+, PostgreSQL (local, Neon, or other)

```bash
git clone https://github.com/Abubakr-Sanginov/KhatBar.git
cd KhatBar
npm install
cp .env.example .env
# edit .env and set DATABASE_URL

npx prisma db push
npm run dev
```

### Option 3: Deploy to Render

1. Push your repo to GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Set environment variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `NODE_ENV` - production
4. Deploy. Render will run `npm install && npm run build` and start with `npm run start`

### Mobile app

```bash
cd mobile
npm install
cp .env.example .env
# edit .env and set EXPO_PUBLIC_API_URL (e.g., http://192.168.1.10:3000 or https://khatbar.onrender.com)

npx expo start
```

Scan the QR code with Expo Go on Android or the Camera app on iOS.

> **Note:** For full functionality (E2EE, WebRTC calls), build a development client with `npx expo run:android` or `npx expo run:ios`. Expo Go works for messaging but not for native modules.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_WS_URL` | Yes | WebSocket origin (same as web origin) |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app origin |
| `NEXT_PUBLIC_GIPHY_API_KEY` | No | GIPHY integration |
| `NEXT_PUBLIC_TURN_URL` / `_USERNAME` / `_CREDENTIAL` | No | TURN relay for calls behind strict NAT |
| `EXPO_PUBLIC_API_URL` (mobile) | Yes | Backend URL for the mobile client |

Never commit real `.env` files; they are git-ignored. Commit only `.env.example`.

---

## Repository Layout

```
src/                        # Web app (Next.js)
  app/api/                  # REST endpoints (auth, chats, messages, uploads)
  components/               # UI (chat, calls, dialogs, pickers, settings)
  hooks/                    # useAuth, useCall, useSocket
  lib/                      # e2ee.ts, webrtc.ts, socket-client.ts, skins.ts
  lib/local-chat/           # offline E2EE: transport, crypto, sync, db
  server/socket.ts          # Socket.IO server: messaging, presence, calls
  stores/                   # Zustand stores
prisma/schema.prisma        # Database schema
server.ts                   # Custom HTTP + Socket.IO server entry
mobile/                     # Mobile app (Expo SDK 57)
  src/
    api/                    # REST client and typed endpoints
    hooks/                  # useSocket, useCall, useTheme
    lib/                    # e2ee.ts (quick-crypto), utils
    navigation/             # Stack and tab navigators
    screens/                # auth, chat, call, settings
    socket/                 # Socket.IO client
    stores/                 # Zustand stores
    theme/                  # Aurora and Ember palettes, interface metadata
```

---

## Two Interfaces

KhatBar ships with two complete visual interfaces. They are not themes bolted onto
one design: each has its own palette, typography and surface treatment, and both
expose every feature.

| | Aurora | Ember |
|---|---|---|
| Character | Neutral, system-native, quiet | Warm signal in the dark |
| Surfaces | Greyscale cards on white or black | Green-shifted charcoal ink |
| Accent | Violet on web, iOS blue on mobile | Copper, single accent throughout |
| Typography | Geist | Bricolage Grotesque for headings, Manrope for body |
| Best for | Blending into the host OS | Long sessions, low light, focus |

---

## Local Chat (Offline and End-to-End Encrypted)

A fully offline chat layer that never touches the server. It lives in
[src/lib/local-chat/](src/lib/local-chat/) and is built from three layers:

```
+-------------------------------------------------------------+
|  Transport   peer discovery and socket                      |
|              - BroadcastChannel (tabs, same machine)        |
|              - WebRTC DataChannel (Wi-Fi LAN, no STUN)      |
|              - pairing via 8-character code + SDP exchange  |
+-------------------------------------------------------------+
|  Crypto      identity: ECDH P-256 keypair per device        |
|              keys exchanged at pairing                      |
|              messages: AES-256-GCM (shared secret)          |
+-------------------------------------------------------------+
|  Sync        delivery ledger (IndexedDB)                    |
|              pending -> delivered (ack) -> failed           |
|              auto-resend when the peer is back in range     |
+-------------------------------------------------------------+
```

**Using it:**
1. Open KhatBar in two tabs, or on two devices on the same Wi-Fi network.
2. In the sidebar choose **Local**, then **Pair**.
3. Pick the discovered device and press **Pair**, or exchange a pairing code over LAN.
4. Messages flow directly between the devices. Stop the server and they still work.

---

## Calls and Encryption in Detail

**Calls.** `call:invite` leads to `call:accept`, then signaling (`call:signal` carries
SDP and ICE), then mesh peer connections. The call lifecycle is persisted through the
`Call` model, a `CALL` message appears in chat history, and missed or declined calls
are recorded.

**Encryption.** Each device generates an ECDH P-256 keypair on first login. Only the
public JWK is uploaded, through `PUT /api/keys`. For a private chat, both peers'
public keys plus the chat's random salt derive a per-chat AES-256-GCM key via HKDF.
Closed groups wrap a shared group key per member. The server only ever stores
ciphertext.

---

## Security and Privacy Audit Disclaimer

KhatBar is a learning project and has NOT been reviewed by a professional
security auditor. It is fine for personal use; it is NOT ready for production
data you cannot afford to lose.

**Key lifecycle.** Identity keypairs live in the browser (WebCrypto, non-extractable)
or SecureStore (mobile). The private half never leaves the device. When a user
clears site data or reinstalls, new keys are generated and past chats in private
conversations become undecryptable by design.

**Reporting.** Found a bug or a security issue? Open a GitHub issue. Do not
include real credentials or keys in reports.

---

## Active Development Roadmap

The table below outlines known gaps and planned improvements. Items are
tracked as GitHub Issues — contributions are welcome.

| Area | Current state | Planned improvement | Issue |
|---|---|---|---|
| Forward secrecy | Static ECDH keys; a compromised long-term key decrypts old chats | Double Ratchet Protocol (Signal-style ratcheting) for per-message key derivation | [#1](https://github.com/Abubakr-Sanginov/KhatBar/issues/1) |
| Key pinning | Public keys fetched from the server, no fingerprint UI | TOFU-style fingerprint verification in chat profile | — |
| Pairing (local chat) | 8-character code + WebRTC SDP exchange | SAS (short authentication string) comparison during pairing | — |
| Local key storage (web) | Private keys unencrypted in IndexedDB | PBKDF2-derived passphrase to encrypt keys at rest | [#4](https://github.com/Abubakr-Sanginov/KhatBar/issues/4) |
| Call relay | STUN only by default, TURN optional | SFU (LiveKit/Mediasoup) for 3+ participant group calls | — |
| Mesh call cleanup | RTCPeerConnection resources not fully released on leave | Proper disposal of connections, tracks and listeners | [#3](https://github.com/Abubakr-Sanginov/KhatBar/issues/3) |
| Socket.IO scaling | Single-instance in-memory adapter | Redis adapter (`@socket.io/redis-adapter`) for horizontal scaling | [#2](https://github.com/Abubakr-Sanginov/KhatBar/issues/2) |
| DB pooling | Prisma direct connection pool | PgBouncer or serverless pooler for high concurrency | — |
| Uploads | Magic-byte checks, SVG excluded | S3/MinIO object storage, image re-encoding, malware scanning | — |
| Push notifications | None; calls and chats only work while the app is open | APNs / FCM via expo-notifications | — |
| Message spam | Socket rate limiting in place | Webhook-based abuse detection, CAPTCHA on registration | — |

---

## Tech Stack

| Layer | Web | Mobile |
|---|---|---|
| Framework | Next.js 16 (App Router) | Expo SDK 57, React Native 0.86 |
| Language | TypeScript 5 | TypeScript 5 |
| UI | Tailwind v4, shadcn/ui, Framer Motion | React Navigation, custom RN components |
| Interfaces | `data-skin` token scopes | palette records plus themed style factories |
| State | Zustand 5 | Zustand 5 |
| Realtime | Socket.IO 4.8 client | Socket.IO 4.8 client |
| Calls | WebRTC in the browser | react-native-webrtc |
| Crypto | WebCrypto | react-native-quick-crypto, SecureStore |
| Database | PostgreSQL with Prisma 7 | shared backend |

---

## Scripts

**Web:**

```bash
npm run dev          # dev server on :3000, Socket.IO included
npm run build        # production build
npm run start        # production server
npm run lint         # eslint
npx prisma db push   # apply the schema
```

**Mobile:**

```bash
npx expo start        # Metro dev server
npx expo run:android  # native build
npx expo run:ios      # native build
npx expo-doctor       # health check
```

---

## Contributing

Issues and pull requests are welcome. Before opening a pull request, please run
`npm run lint` and `npm run build` for the web app and `npx tsc --noEmit` inside
`mobile/`. If a change touches colour, keep both interfaces working: use the semantic
tokens rather than literal hex values, so Aurora and Ember both stay correct.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

Released under the [MIT License](./LICENSE). Copyright 2026 KhatBar contributors.

You may use, copy, modify, merge, publish, distribute, sublicense and sell copies of
this software, provided the copyright notice and permission notice are included. The
software is provided without warranty of any kind.

<div align="center">

Built with TypeScript, Next.js, React Native, WebRTC and WebCrypto.

</div>
