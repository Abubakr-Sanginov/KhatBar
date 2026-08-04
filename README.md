<div align="center">

# KhatBar

**End-to-end encrypted messenger — Web (Next.js) + Mobile (Expo/React Native)**

Real-time chat, voice & video calls, screen sharing, private/public groups, channels — built on one shared backend.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Expo](https://img.shields.io/badge/Expo_SDK_57-000020?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native_0.86-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)

</div>

---

## ✨ Features

### 💬 Messaging
- 1:1 private chats, groups and broadcast channels
- Public & private groups with usernames (`@public_group`) and invite links
- Rich media: images, video, GIFs, stickers, voice messages, files
- Replies, editing, pinning, deletion, read receipts, typing indicators
- Message search, unread badges, last-seen & online presence
- **End-to-end encryption** (ECDH P-256 + AES-256-GCM + HKDF) for private chats and closed groups — keys never leave the device
- **Local chats** — device-to-device messaging with **zero server involvement** (see [Local chat](#-local-chat-offline-e2ee))

### 📞 Calls
- Audio & video calls, group mesh calls
- Screen sharing, mute/camera toggles mid-call
- Incoming/outgoing ringing, call timer, minimized call bar
- WebRTC mesh with perfect negotiation, STUN/TURN support

### 👥 Communities
- Channels with linked public groups (two-way binding)
- Roles: Owner / Admin / Moderator / Member
- Admin panel: users, chats, messages, reports moderation

### 🔒 Security
- Session-based auth (httpOnly cookies), SHA-256 password hashing
- E2EE identity keys stored in IndexedDB (web) / SecureStore (mobile)
- MIME-validated uploads, rate-limited APIs

---

## 🏗 Architecture

```
┌─────────────────────────────┐      ┌──────────────────────────────┐
│         Web Client          │      │      Mobile Client (Expo)    │
│  Next.js 16 + React 19      │      │  React Native 0.86, SDK 57   │
│  Tailwind v4 + shadcn/ui    │      │  React Navigation, Zustand   │
│  WebRTC (browser media)     │      │  react-native-webrtc         │
│  WebCrypto (E2EE)           │      │  react-native-quick-crypto   │
└──────────────┬──────────────┘      └───────────────┬──────────────┘
               │   HTTP REST (session cookie)        │
               │   WebSocket (Socket.IO, :3000)      │
               ▼                                     ▼
        ┌─────────────────────────────────────────────────┐
        │             Custom Node server (server.ts)      │
        │   Next.js API routes  +  Socket.IO signaling    │
        └────────────────────────┬────────────────────────┘
                                 ▼
                     ┌─────────────────────┐
                     │  PostgreSQL (Neon)  │
                     │   Prisma 7 ORM      │
                     └─────────────────────┘
```

- **One shared backend** — both clients talk to the same REST API and Socket.IO events
- WebRTC is **peer-to-peer mesh**: signaling goes through the server, media flows directly between clients
- E2EE is **wire-compatible across clients** — a web and a mobile user can chat in an encrypted chat

---

## 📁 Repository layout

```
├── src/                    # Web app (Next.js)
│   ├── app/api/            # REST endpoints (auth, chats, messages, uploads…)
│   ├── components/         # UI (chat, calls, dialogs, pickers…)
│   ├── hooks/              # useAuth, useCall, useSocket
│   ├── lib/                # e2ee.ts, webrtc.ts, socket-client.ts, call-sounds…
│   ├── lib/local-chat/     # offline E2EE: transport, crypto, sync, db
│   ├── server/socket.ts    # Socket.IO server: messaging, presence, calls
│   └── stores/             # Zustand stores
├── prisma/schema.prisma    # Database schema
├── server.ts               # Custom HTTP + Socket.IO server entry
└── mobile/                 # Mobile app (Expo SDK 57)
    └── src/
        ├── api/            # REST client + typed endpoints
        ├── hooks/          # useSocket, useCall
        ├── lib/            # e2ee.ts (quick-crypto), utils
        ├── navigation/     # Stack + Tab navigators
        ├── screens/        # auth, chat, call, settings
        ├── socket/         # Socket.IO client
        ├── stores/         # Zustand stores
        └── theme/          # light/dark color tokens
```

---

## 🚀 Getting started

### Prerequisites
- **Node.js ≥ 22.13**
- A Neon (PostgreSQL) database or any Postgres instance
- For mobile: Expo Go on a device/emulator

### 1. Web

```bash
# install
npm install

# configure environment
cp .env.example .env
#   → set DATABASE_URL to your Postgres/Neon connection string

# sync the schema
npx prisma db push
npx prisma generate

# run (custom server with Socket.IO on :3000)
npm run dev
```

Open **http://localhost:3000**, register an account and start chatting.

### 2. Mobile (Expo SDK 57)

```bash
cd mobile

# install
npm install

# point the app at your backend (use your machine's LAN IP, not localhost!)
cp .env.example .env   # EXPO_PUBLIC_API_URL=http://192.168.1.10:3000

# start
npx expo start
```

Scan the QR code with **Expo Go** (Android) or the Camera app (iOS). The mobile app shares accounts, chats, messages and calls with the web app — run both, log in as two users and try an encrypted chat or a video call.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXT_PUBLIC_WS_URL` | ✅ | WebSocket origin (same as web origin) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public app origin |
| `NEXT_PUBLIC_GIPHY_API_KEY` | ❌ | GIPHY integration (optional) |
| `NEXT_PUBLIC_TURN_URL` / `_USERNAME` / `_CREDENTIAL` | ❌ | TURN relay for calls behind strict NAT |
| `EXPO_PUBLIC_API_URL` (mobile) | ✅ | Backend URL for the mobile client |

> **Note:** never commit real `.env` files — they are git-ignored. Commit only `.env.example`.

---

## 📡 Local chat (offline / E2EE)

A fully offline, end-to-end-encrypted chat layer that **never touches the server**. It lives in `src/lib/local-chat/` and is built from three layers:

```
┌─────────────────────────────────────────────────────────┐
│  Transport   peer discovery + socket                    │
│              · BroadcastChannel (tabs / same machine)   │
│              · WebRTC DataChannel (Wi-Fi LAN, no STUN)  │
│              · pairing via 8-char code + SDP exchange   │
├─────────────────────────────────────────────────────────┤
│  Crypto      identity: ECDH P-256 keypair per device    │
│              keys exchanged at pairing                  │
│              messages: AES-256-GCM (shared secret)      │
├─────────────────────────────────────────────────────────┤
│  Sync        delivery ledger (IndexedDB)                │
│              pending → delivered (ack) → failed         │
│              auto-resend when peer is back in range     │
└─────────────────────────────────────────────────────────┘
```

- **Transport** (`transport.ts`) — `BroadcastChannel` discovers peers on the same machine instantly; WebRTC DataChannels connect devices on the same Wi-Fi network with **no STUN/TURN servers** (host candidates only). Cross-network pairing uses an 8-character code exchanged out-of-band.
- **Crypto** (`crypto.ts`) — every device generates an ECDH P-256 identity keypair on first boot (stored in IndexedDB). At pairing time peers exchange public keys; all messages are then sealed with AES-256-GCM using the derived shared secret. Even if the LAN is sniffed, nothing is readable.
- **Sync** (`sync.ts` + `db.ts`) — outgoing messages are written to an outbox as ciphertext *before* anything is sent. If the peer is unreachable they stay `pending` and are **re-sent automatically** when the device comes back in range; the peer answers with an `ack` and the ledger flips to `delivered`. History is stored decrypted only on the sender's device.

### Using it

1. Open KhatBar in two tabs (or two devices on the same Wi-Fi).
2. In the sidebar press **Local → + Pair**.
3. Pick the discovered device and press **Pair** (or exchange a pairing code for LAN).
4. Messages flow directly between the devices — close the server and they still work.

---

## 📞 Calls & E2EE in detail

**Calls.** `call:invite` → `call:accept` → signaling (`call:signal` carries SDP + ICE) → mesh peer connections. Call lifecycle is persisted (`Call` model), a `CALL` message appears in chat history, missed/declined calls are recorded.

**Encryption.** Each device generates an ECDH P-256 keypair on first login. Only the public JWK is uploaded (`PUT /api/keys`). For a private chat, both peers' public keys plus the chat's random salt derive a per-chat AES-256-GCM key via HKDF. Closed groups wrap a shared group key per member. The server only ever stores ciphertext.

---

## 🛠 Tech stack

| Layer | Web | Mobile |
|---|---|---|
| Framework | Next.js 16 (App Router) | Expo SDK 57 / React Native 0.86 |
| Language | TypeScript 5 | TypeScript 5 |
| UI | Tailwind v4, shadcn/ui, Framer Motion | React Navigation, custom RN components |
| State | Zustand 5 | Zustand 5 |
| Realtime | Socket.IO 4.8 (client) | Socket.IO 4.8 (client) |
| Calls | WebRTC (browser) | react-native-webrtc |
| Crypto | WebCrypto | react-native-quick-crypto + SecureStore |
| DB / ORM | PostgreSQL (Neon) + Prisma 7 | — (shared backend) |

---

## 🧪 Scripts

```bash
npm run dev       # start web dev server (:3000, Socket.IO included)
npm run build     # production build
npm run start     # production server
npm run lint      # eslint
npx prisma db push  # apply schema
```

Mobile:
```bash
npx expo start        # start Metro dev server
npx expo run:android  # native build
npx expo-doctor       # health check
```

---

## 📄 License

[MIT](./LICENSE) © 2026 KhatBar contributors

---

Made with TypeScript, Next.js, React Native, WebRTC and WebCrypto.
