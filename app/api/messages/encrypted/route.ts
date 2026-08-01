import { randomBytes } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { encryptMessage } from '@/lib/security/encryption'

const schema = z.object({
  body: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const payload = schema.parse(await request.json())
  const envelope = encryptMessage(payload.body, randomBytes(32))

  return NextResponse.json({
    algorithm: envelope.algorithm,
    ciphertextBase64: envelope.ciphertext.toString('base64'),
    ivBase64: envelope.iv.toString('base64'),
    authTagBase64: envelope.authTag.toString('base64'),
  })
}
