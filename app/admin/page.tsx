import { AdminStatCard } from '@/components/admin/admin-stat-card'
import { getAdminOverview } from '@/lib/admin/service'
import { getCurrentUser } from '@/lib/auth'
import { requireAdmin } from '@/lib/security/access-control'

export default async function AdminPage() {
  const currentUser = await getCurrentUser()

  if (!process.env.DATABASE_URL) {
    const overview = {
      usersTotal: 3,
      adminsTotal: 1,
      suspendedUsersTotal: 0,
      conversationsTotal: 3,
      encryptedConversationsTotal: 1,
      lockedChannelsTotal: 0,
    }

    return (
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Admin demo</div>
            <h1 className="mt-2 text-3xl font-semibold">KhatBar control panel</h1>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AdminStatCard label="Users" value={overview.usersTotal} />
            <AdminStatCard label="Admins" value={overview.adminsTotal} tone="accent" />
            <AdminStatCard label="Suspended users" value={overview.suspendedUsersTotal} tone="danger" />
            <AdminStatCard label="Conversations" value={overview.conversationsTotal} />
            <AdminStatCard label="Encrypted conversations" value={overview.encryptedConversationsTotal} tone="accent" />
            <AdminStatCard label="Locked channels" value={overview.lockedChannelsTotal} tone="danger" />
          </div>
        </div>
      </main>
    )
  }

  await requireAdmin(currentUser.id)
  const overview = await getAdminOverview()

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Admin</div>
          <h1 className="mt-2 text-3xl font-semibold">KhatBar control panel</h1>
          <p className="mt-3 text-sm text-slate-400">
            User moderation, encrypted conversation visibility, channel controls, and audit-ready actions.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AdminStatCard label="Users" value={overview.usersTotal} />
          <AdminStatCard label="Admins" value={overview.adminsTotal} tone="accent" />
          <AdminStatCard label="Suspended users" value={overview.suspendedUsersTotal} tone="danger" />
          <AdminStatCard label="Conversations" value={overview.conversationsTotal} />
          <AdminStatCard label="Encrypted conversations" value={overview.encryptedConversationsTotal} tone="accent" />
          <AdminStatCard label="Locked channels" value={overview.lockedChannelsTotal} tone="danger" />
        </div>
      </div>
    </main>
  )
}
