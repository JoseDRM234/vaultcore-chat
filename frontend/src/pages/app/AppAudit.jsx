const logs = [
  ['09:42:18', 'Role updated', 'Jon Bell → Auditor'],
  ['09:18:04', 'Key rotation completed', 'Workspace / Production'],
  ['Yesterday', 'Export requested', 'Audit range: 30 days'],
]

export default function AppAudit() {
  return (
    <div className="p-6 sm:p-10">
      <p className="font-mono text-xs uppercase tracking-widest text-cyan-300">Auditor view / Read-only</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Audit access</h1>
      <p className="mt-2 text-sm text-slate-400">
        You can inspect compliance events. Changes are restricted to administrators.
      </p>
      <div className="mt-8 overflow-hidden rounded-xl border border-slate-800 bg-[#121b27]">
        {logs.map(([time, action, detail]) => (
          <div
            key={time}
            className="flex flex-col gap-2 border-b border-slate-800 p-5 last:border-0 sm:flex-row sm:items-center"
          >
            <span className="w-24 font-mono text-xs text-slate-500">{time}</span>
            <div className="flex-1">
              <p className="text-sm font-medium">{action}</p>
              <p className="mt-1 text-xs text-slate-500">{detail}</p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              Read only
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
