import { NextResponse } from 'next/server'

import { getAdminOverview } from '@/lib/admin/service'
import { getCurrentUser } from '@/lib/auth'
import { requireAdmin } from '@/lib/security/access-control'

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      usersTotal: 3,
      adminsTotal: 1,
      suspendedUsersTotal: 0,
      conversationsTotal: 3,
      encryptedConversationsTotal: 1,
      lockedChannelsTotal: 0,
      demo: true,
    })
  }

  const currentUser = await getCurrentUser()
  await requireAdmin(currentUser.id)
  return NextResponse.json(await getAdminOverview())
}
