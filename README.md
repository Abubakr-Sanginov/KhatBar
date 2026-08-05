<div align="center">

# KhatBar

**End-to-end encrypted messenger for the web and mobile, on one shared backend.**

Real-time messaging, voice and video calls, screen sharing, public and private groups,
channels, and a device-to-device mode that works with no server at all.

[![License: MIT](https://img.shields.io/badge/License-MIT-e8703a?style=for-the-badge)](./LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Expo](https://img.shields.io/badge/Expo_SDK_57-000020?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native_0.86-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)

[Interfaces](#two-interfaces) &middot;
[Features](#features) &middot;
[Architecture](#architecture) &middot;
[Quick start](#quick-start-with-docker) &middot;
[Local chat](#local-chat-offline-and-end-to-end-encrypted) &middot;
[License](#license)

</div>

---

## Two interfaces

KhatBar ships with two complete visual interfaces. They are not themes bolted onto
one design: each has its own palette, typography and surface treatment, and both
expose every feature. The choice is yours, on every device, at any time.

| | Aurora | Ember |
|---|---|---|
| Character | Neutral, system-native, quiet | Warm signal in the dark |
| Surfaces | Greyscale cards on white or black | Green-shifted charcoal ink |
| Accent | Violet on web, iOS blue on mobile | Copper, single accent throughout |
| Typography | Geist | Bricolage Grotesque for headings, Manrope for body |
| Best for | Blending into the host OS | Long sessions, low light, focus |

### Switching

- **Web** &mdash; open the account menu in the sidebar, choose **Settings**, then pick an
  interface under **Interface**. The change is instant, with no reload.
- **Mobile** &mdash; open the **Settings** tab and pick an interface under **Interface**.

Light, dark and system appearance are independent of the interface choice, so
Aurora and Ember are each available in both modes. Both settings are stored per
device (`localStorage` on web, `AsyncStorage` on mobile) and never leave it, so
one account can look different on your laptop and your phone.

Under the hood the two interfaces are one token set with two bindings. On the web
a `data-skin` attribute on `<html>` rebinds the same semantic custom properties
(`--background`, `--primary`, `--card`, and the rest) that every component already
consumes, so no component knows which interface is active. On mobile the matching
palettes live in [mobile/src/theme/colors.ts](mobile/src/theme/colors.ts) and reach
screens through a `useThemedStyles(makeStyles)` hook that re-memoizes when the
palette changes. Adding a third interface means adding one palette in each place.

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

### Security
- Session-based auth (httpOnly cookies), SHA-256 password hashing
- E2EE identity keys stored in IndexedDB (web) / SecureStore (mobile)
- MIME-validated uploads, rate-limited APIs

### Interfaces
- Two built-in interfaces: **Aurora** (default, neutral surfaces + violet accent) and **Ember** (dark-first "warm signal": ink surfaces, copper accent)
- Switch any time from Settings - the choice is stored per device and applied before the first paint

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

- One shared backend: both clients speak the same REST API and Socket.IO events.
- WebRTC is a peer-to-peer mesh. Signaling goes through the server; media flows
  directly between clients.
- E2EE is wire-compatible across clients, so a web user and a mobile user can talk
  in the same encrypted chat.

---

## Repository layout

```
+-- src/                    # Web app (Next.js)
|   +-- app/api/            # REST endpoints (auth, chats, messages, uploads)
|   +-- components/         # UI (chat, calls, dialogs, pickers, settings)
|   +-- hooks/              # useAuth, useCall, useSocket
|   +-- lib/                # e2ee.ts, webrtc.ts, socket-client.ts, skins.ts
|   +-- lib/local-chat/     # offline E2EE: transport, crypto, sync, db
|   +-- server/socket.ts    # Socket.IO server: messaging, presence, calls
|   +-- stores/             # Zustand stores
+-- prisma/schema.prisma    # Database schema
+-- server.ts               # Custom HTTP + Socket.IO server entry
+-- mobile/                 # Mobile app (Expo SDK 57)
    +-- src/
        +-- api/            # REST client and typed endpoints
        +-- hooks/          # useSocket, useCall, useTheme
        +-- lib/            # e2ee.ts (quick-crypto), utils
        +-- navigation/     # Stack and tab navigators
        +-- screens/        # auth, chat, call, settings
        +-- socket/         # Socket.IO client
        +-- stores/         # Zustand stores
        +-- theme/          # Aurora and Ember palettes, interface metadata
```

---

## Quick start with Docker

The fastest way to run the whole stack. Compose starts PostgreSQL and the app together.

Prerequisites: Docker and Docker Compose v2.

```bash
git clone https://github.com/Abubakr-Sanginov/KhatBar.git
cd KhatBar
docker compose up -d --build
```

Open http://localhost:3000, register an account and start chatting.

### Configuration

All settings live in the `env` section of `docker-compose.yml`.

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | postgres://khatbar:khatbar@db:5432/khatbar | PostgreSQL connection string, pre-wired to the compose database |
| `NEXT_PUBLIC_WS_URL` | http://localhost:3000 | WebSocket origin, same as the web origin |
| `NEXT_PUBLIC_APP_URL` | http://localhost:3000 | Public app origin |
| `NEXT_PUBLIC_GIPHY_API_KEY` | empty | GIPHY integration, optional |
| `NEXT_PUBLIC_TURN_URL` / `_USERNAME` / `_CREDENTIAL` | empty | TURN relay for calls behind strict NAT |

The app container runs Prisma migrations on startup, so the schema is applied for
you. Uploads persist in the `uploads` volume and PostgreSQL data in `db-data`.

```bash
docker compose logs -f app   # follow app logs
docker compose down          # stop, keep data
docker compose down -v       # stop and wipe volumes for a fresh start
```

---

## Manual setup

Prerequisites: Node.js 22.13 or newer, a PostgreSQL instance (local, Neon, or other),
and Expo Go on a device or emulator for the mobile app.

### 1. Web

```bash
npm install

cp .env.example .env
#   set DATABASE_URL to your Postgres connection string

npx prisma db push
npx prisma generate

npm run dev            # custom server with Socket.IO on :3000
```

Open http://localhost:3000 and register an account.

### 2. Mobile (Expo SDK 57)

```bash
cd mobile
npm install

cp .env.example .env
#   EXPO_PUBLIC_API_URL=http://192.168.1.10:3000
#   use your machine's LAN IP, not localhost

npx expo start
```

Scan the QR code with Expo Go on Android or the Camera app on iOS. The mobile app
shares accounts, chats, messages and calls with the web app. Run both, sign in as
two users, and try an encrypted chat or a video call.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_WS_URL` | Yes | WebSocket origin, same as the web origin |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app origin |
| `NEXT_PUBLIC_GIPHY_API_KEY` | No | GIPHY integration |
| `NEXT_PUBLIC_TURN_URL` / `_USERNAME` / `_CREDENTIAL` | No | TURN relay for calls behind strict NAT |
| `EXPO_PUBLIC_API_URL` (mobile) | Yes | Backend URL for the mobile client |

Never commit real `.env` files; they are git-ignored. Commit only `.env.example`.

---

## Local chat (offline and end-to-end encrypted)

A fully offline chat layer that never touches the server. It lives in
[src/lib/local-chat/](src/lib/local-chat/) and is built from three layers.

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

- **Transport** ([transport.ts](src/lib/local-chat/transport.ts)) &mdash;
  `BroadcastChannel` discovers peers on the same machine instantly; WebRTC
  DataChannels connect devices on the same Wi-Fi network with no STUN or TURN
  servers, using host candidates only. Cross-network pairing uses an 8-character
  code exchanged out of band.
- **Crypto** ([crypto.ts](src/lib/local-chat/crypto.ts)) &mdash; every device generates
  an ECDH P-256 identity keypair on first boot, stored in IndexedDB. Peers exchange
  public keys at pairing time, and all messages are then sealed with AES-256-GCM
  using the derived shared secret. Sniffing the LAN yields nothing readable.
- **Sync** ([sync.ts](src/lib/local-chat/sync.ts) and
  [db.ts](src/lib/local-chat/db.ts)) &mdash; outgoing messages are written to an outbox
  as ciphertext before anything is sent. If the peer is unreachable they stay
  pending and are re-sent automatically once the device is back in range; the peer
  answers with an ack and the ledger flips to delivered. History is stored
  decrypted only on the sender's device.

### Using it

1. Open KhatBar in two tabs, or on two devices on the same Wi-Fi network.
2. In the sidebar choose **Local**, then **Pair**.
3. Pick the discovered device and press **Pair**, or exchange a pairing code over LAN.
4. Messages flow directly between the devices. Stop the server and they still work.

---

## Calls and encryption in detail

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

## Security and privacy audit disclaimer

KhatBar is a learning project and has NOT been reviewed by a professional
security auditor. It is fine for personal use; it is NOT ready for production
data you cannot afford to lose. Known limitations, in order of severity:

| Area | Current state | Gap / roadmap |
|---|---|---|
| Key pinning | Public keys are fetched from the server, no fingerprint UI | Show a fingerprint in the chat profile and verify it out-of-band (TOFU-style or manual comparison) |
| Forward secrecy | Static ECDH keys; a compromised long-term key decrypts old chats | Ephemeral per-session DH or a Double Ratchet; re-derive keys periodically |
| Pairing (local chat) | 8-character code + WebRTC SDP exchange on the same network | Add SAS (short authentication string) comparison during pairing |
| Local key storage (web) | Private keys sit unencrypted in IndexedDB | PBKDF2-derived passphrase to encrypt the private key at rest |
| Call relay | STUN only by default, TURN optional via env | Configure `NEXT_PUBLIC_TURN_*` for symmetric NATs; SFU (LiveKit/Mediasoup) for 3+ participant groups |
| Message spam | Socket rate limiting is in place | Webhook-based abuse detection, CAPTCHA on registration |
| Socket.IO scaling | Single-instance in-memory adapter | `@socket.io/redis-adapter` for horizontal scaling |
| DB pooling | Prisma direct pool | PgBouncer or a serverless pooler for many concurrent connections |
| Uploads | Magic-byte checks, SVG excluded | S3/MinIO object storage, image re-encoding, malware scanning |
| Push notifications | None; calls and chats only work while the app is open | APNs / FCM via expo-notifications |

**Key lifecycle.** Identity keypairs live in the browser (WebCrypto, non-extractable)
or SecureStore (mobile). The private half never leaves the device. When a user
clears site data or reinstalls, new keys are generated and past chats in private
conversations become undecryptable by design.

**Reporting.** Found a bug or a security issue? Open a GitHub issue. Do not
include real credentials or keys in reports.

---

## Tech stack

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

Web:

```bash
npm run dev          # dev server on :3000, Socket.IO included
npm run build        # production build
npm run start        # production server
npm run lint         # eslint
npx prisma db push   # apply the schema
```

Mobile:

```bash
npx expo start        # Metro dev server
npx expo run:android  # native build
npx expo-doctor       # health check
```

---

## Contributing

Issues and pull requests are welcome. Before opening a pull request, please run
`npm run lint` and `npm run build` for the web app and `npx tsc --noEmit` inside
`mobile/`. If a change touches colour, keep both interfaces working: use the semantic
tokens rather than literal hex values, so Aurora and Ember both stay correct.

---

## License

Released under the [MIT License](./LICENSE). Copyright 2026 KhatBar contributors.

You may use, copy, modify, merge, publish, distribute, sublicense and sell copies of
this software, provided the copyright notice and permission notice are included. The
software is provided without warranty of any kind.

<div align="center">

Built with TypeScript, Next.js, React Native, WebRTC and WebCrypto.

</div>





