export function UserCard({
  username,
  displayName,
  statusText,
}: {
  username: string
  displayName: string
  statusText?: string | null
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Profile</div>
      <h1 className="mt-3 text-2xl font-semibold text-white">{displayName}</h1>
      <p className="mt-1 text-sm text-emerald-300">@{username}</p>
      <p className="mt-4 text-sm text-slate-400">{statusText ?? 'No status set'}</p>
    </div>
  )
}
