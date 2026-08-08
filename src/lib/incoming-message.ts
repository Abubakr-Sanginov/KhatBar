"use client"

import type { Chat, Message } from "@/types"
import {
  decryptPrivateChatMessages,
  ENCRYPTED_MESSAGE_KEY_UNAVAILABLE,
  isEncryptedEnvelope,
} from "@/lib/e2ee"

export async function normalizeIncomingMessage(
  chat: Chat | null | undefined,
  userId: string | null | undefined,
  message: Message,
): Promise<Message> {
  if (!chat || !userId) {
    return message.isEncrypted || isEncryptedEnvelope(message.content)
      ? { ...message, content: ENCRYPTED_MESSAGE_KEY_UNAVAILABLE }
      : message
  }
  const [normalized] = await decryptPrivateChatMessages(chat, userId, [message])
  return normalized
}
