import { notFound } from 'next/navigation'

import { UserCard } from '@/components/chat/user-card'
import { prisma } from '@/lib/db'
import { getMockBootstrap } from '@/lib/messenger/mock'

export default async function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params

  if (!process.env.DATABASE_URL) {
    const fallback = getMockBootstrap()
    const current = username === 'abubakr'
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
        <div className="mx-auto max-w-3xl">
          <UserCard
            username={username}
            displayName={current ? 'Abubakr' : fallback.conversations[2]?.name ?? 'KhatBar user'}
            statusText={current ? 'Shipping KhatBar' : 'Using demo profile mode'}
          />
        </div>
      </main>
    )
  }

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) notFound()

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <UserCard username={user.username} displayName={user.displayName} statusText={user.statusText} />
      </div>
    </main>
  )
}
