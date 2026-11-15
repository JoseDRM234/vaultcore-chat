import { Link, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, Users, Network, ClipboardList, UserCircle, ShieldCheck, LogOut } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-provider'
import { useAuth } from '@/context/AuthContext'

const navItems = [
  ['/admin/dashboard', 'Dashboard', BarChart3],
  ['/admin/users', 'Users', Users],
  ['/admin/groups', 'Groups', Network],
  ['/admin/audit', 'Audit log', ClipboardList],
  ['/admin/profile', 'Profile', UserCircle],
]

function getInitials(name) {
  if (!name) return 'AD'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const initials = getInitials(user?.fullName)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-card p-5 lg:flex">
        <div className="flex items-center gap-3 border-b border-border pb-6">
          <div className="grid size-9 place-items-center rounded-lg bg-[#10233f] text-cyan-300">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <p className="font-mono text-sm font-bold tracking-tight">VAULTCORE</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Control plane</p>
          </div>
        </div>
        <nav className="mt-8 flex flex-col gap-2">
          {navItems.map(([href, label, Icon]) => (
            <Link
              key={href}
              to={href}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-xl bg-[#10233f] p-4 text-white">
          <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-300">System status</p>
          <p className="mt-2 text-sm">All systems operational</p>
          <div className="mt-3 h-1 rounded-full bg-slate-700">
            <div className="h-1 w-[92%] rounded-full bg-cyan-300" />
          </div>
        </div>
      </aside>
      <main className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-end gap-3 border-b border-border bg-background/95 px-5 backdrop-blur sm:px-8">
          <div className="flex flex-col items-end mr-1">
            <span className="text-sm font-medium">{user?.fullName || 'Administrator'}</span>
            <span className="font-mono text-[10px] text-muted-foreground">{user?.email || 'admin@vaultcore.test'}</span>
          </div>
          <div className="grid size-9 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initials}
          </div>
          <ThemeToggle />
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition ml-2"
          >
            <LogOut className="size-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>
        {children || <Outlet />}
      </main>
    </div>
  )
}
