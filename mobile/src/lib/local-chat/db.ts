import * as SQLite from "expo-sqlite";
import type { LocalChat, LocalMessage, OutboxItem } from "./types";

let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync("khatbar_local.db");
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      peerId TEXT NOT NULL UNIQUE,
      peerName TEXT NOT NULL,
      peerPublicKey TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chatId TEXT NOT NULL,
      fromMe INTEGER NOT NULL,
      content TEXT NOT NULL,
      delivered INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY,
      chatId TEXT NOT NULL,
      peerId TEXT NOT NULL,
      ciphertext TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'pending',
      createdAt INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chatId, createdAt);
    CREATE INDEX IF NOT EXISTS idx_outbox_state ON outbox(state);
    CREATE INDEX IF NOT EXISTS idx_outbox_peer ON outbox(peerId);
  `);
  return db;
}

export async function listLocalChats(): Promise<LocalChat[]> {
  const db = await getDb();
  return db.getAllAsync<LocalChat>("SELECT * FROM chats ORDER BY updatedAt DESC");
}

export async function getLocalChat(id: string): Promise<LocalChat | undefined> {
  const db = await getDb();
  const result = await db.getFirstAsync<LocalChat>("SELECT * FROM chats WHERE id = ?", [id]);
  return result ?? undefined;
}

export async function getLocalChatByPeer(peerId: string): Promise<LocalChat | undefined> {
  const db = await getDb();
  const result = await db.getFirstAsync<LocalChat>("SELECT * FROM chats WHERE peerId = ?", [peerId]);
  return result ?? undefined;
}

export async function putLocalChat(chat: LocalChat): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO chats (id, peerId, peerName, peerPublicKey, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
    [chat.id, chat.peerId, chat.peerName, chat.peerPublicKey, chat.createdAt, chat.updatedAt]
  );
}

export async function deleteLocalChat(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM messages WHERE chatId = ?", [id]);
  await db.runAsync("DELETE FROM outbox WHERE chatId = ?", [id]);
  await db.runAsync("DELETE FROM chats WHERE id = ?", [id]);
}

export async function listLocalMessages(chatId: string): Promise<LocalMessage[]> {
  const db = await getDb();
  return db.getAllAsync<LocalMessage>(
    "SELECT * FROM messages WHERE chatId = ? ORDER BY createdAt ASC",
    [chatId]
  );
}

export async function putLocalMessage(msg: LocalMessage): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO messages (id, chatId, fromMe, content, delivered, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
    [msg.id, msg.chatId, msg.fromMe ? 1 : 0, msg.content, msg.delivered ? 1 : 0, msg.createdAt]
  );
  await db.runAsync("UPDATE chats SET updatedAt = ? WHERE id = ?", [Date.now(), msg.chatId]);
}

export async function markMessageDelivered(msgId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE messages SET delivered = 1 WHERE id = ?", [msgId]);
}

export async function listOutbox(state: "pending" | "delivered" | "failed"): Promise<OutboxItem[]> {
  const db = await getDb();
  return db.getAllAsync<OutboxItem>(
    "SELECT * FROM outbox WHERE state = ? ORDER BY createdAt ASC",
    [state]
  );
}

export async function putOutboxItem(item: OutboxItem): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO outbox (id, chatId, peerId, ciphertext, state, createdAt, attempts) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [item.id, item.chatId, item.peerId, item.ciphertext, item.state, item.createdAt, item.attempts]
  );
}

export async function updateOutboxState(id: string, state: string, attempts: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE outbox SET state = ?, attempts = ? WHERE id = ?", [state, attempts, id]);
}

export async function deleteOutboxItem(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM outbox WHERE id = ?", [id]);
}
