import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth'
import { getChatBootstrap } from '@/lib/messenger/service'

export async function GET() {
  const currentUser = await getCurrentUser()
  return NextResponse.json(await getChatBootstrap(currentUser.id))
}
