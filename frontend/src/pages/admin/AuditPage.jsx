const events = [
  ['09:42:18', 'Maya Chen', 'Role updated', 'Jon Bell → Auditor'],
  ['09:18:04', 'System', 'Key rotation completed', 'Workspace / Production'],
  ['Yesterday', 'Rina Patel', 'Export requested', 'Audit range: 30 days'],
]

export default function AuditPage() {
  return (
    <div className="p-6 sm:p-10">
      <p className="font-mono text-xs uppercase tracking-widest text-cyan-700">Admin / Compliance</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Audit log</h1>
      <p className="mt-1 text-sm text-slate-500">Immutable activity record for your workspace.</p>
      <div className="mt-8 rounded-xl border border-slate-200 bg-white">
        {events.map(([time, actor, action, detail]) => (
          <div
            key={time}
            className="flex flex-col gap-2 border-b border-slate-100 p-5 last:border-0 sm:flex-row sm:items-center"
          >
            <span className="w-24 font-mono text-xs text-slate-400">{time}</span>
            <div className="flex-1">
              <p className="text-sm font-medium">{action}</p>
              <p className="mt-1 text-xs text-slate-500">{actor} · {detail}</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-1 font-mono text-[10px] uppercase text-emerald-700">
              Verified
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
