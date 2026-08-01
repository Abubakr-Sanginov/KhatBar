export function AdminStatCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: number
  tone?: 'default' | 'danger' | 'accent'
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-rose-500/30 bg-rose-500/10'
      : tone === 'accent'
        ? 'border-emerald-500/30 bg-emerald-500/10'
        : 'border-slate-800 bg-slate-900'

  return (
    <div className={`rounded-3xl border p-5 ${toneClass}`}>
      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
    </div>
  )
}
