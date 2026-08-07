import * as SecureStore from "expo-secure-store";
import type { DeviceIdentity } from "./types";

let subtle: any;
let getRandomValues: <T extends ArrayBufferView>(array: T) => T;
try {
  const qc = require("react-native-quick-crypto");
  subtle = qc.subtle;
  getRandomValues = qc.getRandomValues;
} catch {
  const g = globalThis.crypto ?? (globalThis as any);
  subtle = g.subtle;
  getRandomValues = (arr: any) => g.getRandomValues(arr);
}

const DEVICE_ID_KEY = "khatbar_local_device_id";
const IDENTITY_KEY = "khatbar_local_identity";
const SHARED_KEY_PREFIX = "khatbar_local_shared_";

const ECDH = { name: "ECDH", namedCurve: "P-256" } as const;

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? "=" : B64[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? "=" : B64[b2 & 63];
  }
  return out;
}

export function base64ToBytes(value: string): Uint8Array {
  const clean = value.replace(/[^A-Za-z0-9+/]/g, "");
  const out = new Uint8Array((clean.length * 3) >> 2);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = B64.indexOf(clean[i]);
    const c1 = B64.indexOf(clean[i + 1]);
    const c2 = clean[i + 2] ? B64.indexOf(clean[i + 2]) : -1;
    const c3 = clean[i + 3] ? B64.indexOf(clean[i + 3]) : -1;
    out[p++] = (c0 << 2) | (c1 >> 4);
    if (c2 >= 0) out[p++] = ((c1 & 15) << 4) | (c2 >> 2);
    if (c3 >= 0) out[p++] = ((c2 & 3) << 6) | c3;
  }
  return p === out.length ? out : out.subarray(0, p);
}

function utf8ToBytes(str: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) {
      out.push(c);
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      c = 0x10000 + ((c - 0xd800) << 10) + (str.charCodeAt(++i) - 0xdc00);
      out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
  }
  return new Uint8Array(out);
}

function bytesToUtf8(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i++];
    if (b < 0x80) {
      out += String.fromCharCode(b);
    } else if (b < 0xe0) {
      out += String.fromCharCode(((b & 31) << 6) | (bytes[i++] & 63));
    } else if (b < 0xf0) {
      out += String.fromCharCode(((b & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63));
    } else {
      const cp = ((b & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
      const n = cp - 0x10000;
      out += String.fromCharCode(0xd800 + (n >> 10), 0xdc00 + (n & 1023));
    }
  }
  return out;
}

function toBytes(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer);
}

function randomBytes(length: number): Uint8Array {
  return getRandomValues(new Uint8Array(length)) as Uint8Array;
}

function randomHex(length: number): string {
  return Array.from(randomBytes(length), (b) => b.toString(16).padStart(2, "0")).join("");
}

function generateDeviceName(): string {
  const adjectives = ["Swift", "Bright", "Cool", "Warm", "Wild", "Calm", "Bold", "Keen"];
  const nouns = ["Fox", "Bear", "Hawk", "Wolf", "Lynx", "Deer", "Hare", "Owl"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const code = randomHex(2).toUpperCase();
  return `${adj} ${noun} ${code}`;
}

export async function getOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  const existingId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  const existingIdentity = await SecureStore.getItemAsync(IDENTITY_KEY);

  if (existingId && existingIdentity) {
    return { deviceId: existingId, ...JSON.parse(existingIdentity) };
  }

  const deviceId = randomHex(16);
  const name = generateDeviceName();

  const pair = await subtle.generateKey(ECDH, true, ["deriveBits", "deriveKey"]);
  if (!("privateKey" in pair)) throw new Error("Could not generate key pair");

  const publicKey = JSON.stringify(await subtle.exportKey("jwk", pair.publicKey as any));
  const privateKey = JSON.stringify(await subtle.exportKey("jwk", pair.privateKey as any));

  await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  await SecureStore.setItemAsync(IDENTITY_KEY, JSON.stringify({ name, publicKey, privateKey }));

  return { deviceId, name, publicKey };
}

export async function getStoredPrivateKey(): Promise<any> {
  const raw = await SecureStore.getItemAsync(IDENTITY_KEY);
  if (!raw) throw new Error("No identity key");
  const { privateKey } = JSON.parse(raw);
  return subtle.importKey("jwk", privateKey, ECDH, false, ["deriveBits", "deriveKey"]);
}

async function sharedAesKey(peerPublicKey: string, peerId: string): Promise<any> {
  const cached = await SecureStore.getItemAsync(SHARED_KEY_PREFIX + peerId);
  if (cached) return subtle.importKey("jwk", JSON.parse(cached), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);

  const privateKey = await getStoredPrivateKey();
  const peer = await subtle.importKey("jwk", JSON.parse(peerPublicKey), ECDH, false, []);
  const shared = await subtle.deriveBits({ name: "ECDH", public: peer }, privateKey, 256);
  const key = await subtle.importKey("raw", shared, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);

  const exported = await subtle.exportKey("jwk", key);
  await SecureStore.setItemAsync(SHARED_KEY_PREFIX + peerId, JSON.stringify(exported));

  return key;
}

export async function encryptForPeer(plaintext: string, peerId: string, peerPublicKey: string): Promise<string> {
  const key = await sharedAesKey(peerPublicKey, peerId);
  const iv = randomBytes(12);
  const ciphertext = await subtle.encrypt({ name: "AES-GCM", iv }, key, utf8ToBytes(plaintext));
  return JSON.stringify({ v: 1, iv: bytesToBase64(iv), ciphertext: bytesToBase64(toBytes(ciphertext)) });
}

export async function decryptFromPeer(encoded: string, peerId: string, peerPublicKey: string): Promise<string> {
  const { v, iv, ciphertext } = JSON.parse(encoded);
  if (v !== 1) throw new Error("Invalid envelope");
  const key = await sharedAesKey(peerPublicKey, peerId);
  const plaintext = await subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(iv) }, key, base64ToBytes(ciphertext));
  return bytesToUtf8(toBytes(plaintext));
}

export function chatIdForPeers(a: string, b: string): string {
  return [a, b].sort().join("|");
}
