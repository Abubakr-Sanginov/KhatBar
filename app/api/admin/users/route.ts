import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { suspendUser } from '@/lib/admin/service'
import { getCurrentUser } from '@/lib/auth'
import { requireAdmin } from '@/lib/security/access-control'

const schema = z.object({ targetUserId: z.string().min(1) })

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    const payload = schema.parse(await request.json())
    return NextResponse.json({ id: payload.targetUserId, isSuspended: true, demo: true })
  }

  const currentUser = await getCurrentUser()
  await requireAdmin(currentUser.id)
  const payload = schema.parse(await request.json())
  return NextResponse.json(await suspendUser(payload.targetUserId, currentUser.id))
}
