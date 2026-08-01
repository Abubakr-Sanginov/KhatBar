import { Buffer } from 'node:buffer'

import type { MessageCursor } from '@/lib/messenger/types'

export function encodeMessageCursor(cursor: MessageCursor) {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

export function decodeMessageCursor(cursor?: string | null): MessageCursor | null {
  if (!cursor) return null

  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as MessageCursor
    if (!parsed.createdAt || !parsed.id) return null
    return parsed
  } catch {
    return null
  }
}
