import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

export type EncryptedEnvelope = {
  ciphertext: Buffer
  iv: Buffer
  authTag: Buffer
  algorithm: 'aes-256-gcm'
}

export function encryptMessage(plainText: string, key: Buffer): EncryptedEnvelope {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return { ciphertext, iv, authTag, algorithm: 'aes-256-gcm' }
}

export function decryptMessage(envelope: EncryptedEnvelope, key: Buffer): string {
  const decipher = createDecipheriv(envelope.algorithm, key, envelope.iv)
  decipher.setAuthTag(envelope.authTag)
  const plainText = Buffer.concat([decipher.update(envelope.ciphertext), decipher.final()])
  return plainText.toString('utf8')
}
