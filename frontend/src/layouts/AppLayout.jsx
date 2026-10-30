import { Link, Outlet } from 'react-router-dom'
import { MessageSquare, UsersRound, ClipboardList, Settings, ShieldCheck } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-provider'

const navItems = [
  ['/app/chats', 'Messages', MessageSquare],
  ['/app/groups', 'Groups', UsersRound],
  ['/app/audit', 'Audit access', ClipboardList],
  ['/app/profile', 'Profile', Settings],
]

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-border bg-card p-4 lg:flex lg:flex-col">
        <Link to="/app/chats" className="flex items-center gap-3 px-3 py-3">
          <div className="grid size-9 place-items-center rounded-lg bg-cyan-300 text-[#07111f]">
            <ShieldCheck className="size-5" />
          </div>
          <span className="font-mono font-bold">
            VAULT<span className="text-cyan-300">CORE</span>
          </span>
        </Link>
        <div className="mt-8 flex flex-col gap-1">
          {navItems.map(([href, label, Icon]) => (
            <Link
              key={href}
              to={href}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-3 border-t border-slate-800 pt-4">
          <div className="grid size-9 place-items-center rounded-full bg-cyan-900 text-xs font-semibold text-cyan-200">
            JM
          </div>
          <div>
            <p className="text-sm font-medium">Jordan Miller</p>
            <p className="font-mono text-[10px] uppercase text-slate-500">Member</p>
          </div>
        </div>
      </aside>
      <main className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-end gap-3 border-b border-border bg-background/95 px-5 backdrop-blur sm:px-8">
          <span className="text-sm text-muted-foreground">Jordan Miller</span>
          <div className="grid size-9 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            JM
          </div>
          <ThemeToggle />
        </header>
        {children || <Outlet />}
      </main>
    </div>
  )
}
