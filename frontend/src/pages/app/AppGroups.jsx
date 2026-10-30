const groups = [
  ['Security operations', '9 members', 'Restricted'],
  ['Product leadership', '18 members', 'Restricted'],
  ['Design review', '12 members', 'Standard'],
]

export default function AppGroups() {
  return (
    <div className="p-6 sm:p-10">
      <p className="font-mono text-xs uppercase tracking-widest text-cyan-300">Workspace / Groups</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your groups</h1>
      <p className="mt-2 text-sm text-slate-400">Membership is managed by your workspace administrator.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {groups.map(([name, members, policy]) => (
          <div key={name} className="rounded-xl border border-slate-800 bg-[#121b27] p-5">
            <p className="font-semibold">{name}</p>
            <p className="mt-2 text-sm text-slate-400">{members}</p>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-wider text-cyan-300">
              {policy} · Read-only membership
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
