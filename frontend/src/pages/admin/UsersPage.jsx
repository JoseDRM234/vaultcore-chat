import { Search, UserPlus, MoreHorizontal } from 'lucide-react'

const users = [
  ['Maya Chen', 'maya@northstar.io', 'Administrator', 'Active'],
  ['Jon Bell', 'jon@northstar.io', 'Member', 'Active'],
  ['Rina Patel', 'rina@northstar.io', 'Auditor', 'Review due'],
  ['Owen Wright', 'owen@northstar.io', 'Member', 'Active'],
]

export default function UsersPage() {
  return (
    <div className="p-6 sm:p-10">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-cyan-700">Admin / Directory</p>
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">User management</h1>
            <p className="mt-1 text-sm text-slate-500">Manage workspace access and permissions.</p>
          </div>
          <button className="flex items-center justify-center gap-2 rounded-lg bg-[#10233f] px-4 py-2.5 text-sm font-medium text-white">
            <UserPlus className="size-4" /> Invite user
          </button>
        </div>
      </header>
      <div className="mt-8 flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400">
        <Search className="size-4" />
        <input placeholder="Search users" className="w-full bg-transparent outline-none" />
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              {['User', 'Role', 'Status', ''].map((h) => (
                <th key={h} className="px-5 py-4 font-mono font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(([name, email, role, status]) => (
              <tr key={email} className="border-b border-slate-100 last:border-0">
                <td className="px-5 py-4">
                  <p className="font-medium">{name}</p>
                  <p className="mt-1 text-xs text-slate-400">{email}</p>
                </td>
                <td className="px-5 py-4 text-slate-600">{role}</td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {status}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <button aria-label={`Actions for ${name}`}>
                    <MoreHorizontal className="size-4 text-slate-400" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
