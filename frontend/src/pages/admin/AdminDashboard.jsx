import { Activity, ArrowUpRight, ShieldAlert, Users, Network, Clock3 } from 'lucide-react'

const stats = [
  ['Active users', '1,284', '+12.8%', Users],
  ['Encrypted groups', '86', '+4.2%', Network],
  ['Audit events', '24,891', '+8.1%', Activity],
]

export default function AdminDashboard() {
  return (
    <div>
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5 sm:px-10">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-cyan-700">Admin / Overview</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Good morning, Alex</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="size-2 rounded-full bg-emerald-500" /> Production · EU-West
        </div>
      </header>
      <div className="p-6 sm:p-10">
        <div className="grid gap-4 md:grid-cols-3">
          {stats.map(([label, value, change, Icon]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">{label}</span>
                <Icon className="size-4 text-cyan-700" />
              </div>
              <p className="mt-5 text-3xl font-semibold tracking-tight">{value}</p>
              <p className="mt-2 text-xs text-emerald-600">{change} this month</p>
            </div>
          ))}
        </div>
        <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Security activity</h2>
                <p className="mt-1 text-sm text-slate-500">Events across your workspace</p>
              </div>
              <button className="flex items-center gap-1 text-sm font-medium text-cyan-700">
                View audit <ArrowUpRight className="size-4" />
              </button>
            </div>
            <div className="mt-8 flex h-44 items-end gap-3 border-b border-slate-100 pb-0">
              {[42, 58, 48, 70, 64, 82, 76, 92, 68, 88, 95, 80].map((height, index) => (
                <div key={index} className="flex flex-1 flex-col justify-end gap-2">
                  <div style={{ height: `${height}%` }} className="rounded-t bg-cyan-200" />
                  <span className="font-mono text-[10px] text-slate-400">{index + 1}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold">Attention needed</h2>
            <div className="mt-5 flex flex-col gap-4">
              <div className="flex gap-3 rounded-lg bg-amber-50 p-3">
                <ShieldAlert className="size-4 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-medium">3 access reviews due</p>
                  <p className="mt-1 text-xs text-slate-500">Review before Friday</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg bg-slate-50 p-3">
                <Clock3 className="size-4 shrink-0 text-slate-500" />
                <div>
                  <p className="text-sm font-medium">Key rotation scheduled</p>
                  <p className="mt-1 text-xs text-slate-500">Sunday, 02:00 UTC</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
