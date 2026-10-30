const groups = [
  ['Product leadership', '18 members', 'Restricted'],
  ['Security operations', '9 members', 'Restricted'],
  ['General workspace', '124 members', 'Standard'],
]

export default function GroupsPage() {
  return (
    <div className="p-6 sm:p-10">
      <p className="font-mono text-xs uppercase tracking-widest text-cyan-700">Admin / Structure</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Group management</h1>
      <p className="mt-1 text-sm text-slate-500">Control membership, retention, and encryption policy.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {groups.map(([name, members, policy]) => (
          <div key={name} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="font-semibold">{name}</p>
            <p className="mt-2 text-sm text-slate-500">{members}</p>
            <span className="mt-5 inline-block rounded-full bg-slate-100 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-600">
              {policy}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
