import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { MessageSquare, UsersRound, ClipboardList, Settings, ShieldCheck, LogOut } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-provider'
import { useAuth } from '@/context/AuthContext'

function getInitials(name) {
  if (!name) return 'MB'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function AppLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isAuditor = user?.role === 'auditor'

  const allNavItems = [
    { href: '/app/chats', label: 'Messages', icon: MessageSquare, hideForAuditor: true },
    { href: '/app/groups', label: 'Groups', icon: UsersRound, hideForAuditor: true },
    { href: '/app/audit', label: 'Audit access', icon: ClipboardList, hideForAuditor: false },
    { href: '/app/profile', label: 'Profile', icon: Settings, hideForAuditor: false },
  ]

  const navItems = allNavItems.filter((item) => (isAuditor ? !item.hideForAuditor : true))
  const initials = getInitials(user?.fullName)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-border bg-card p-4 lg:flex lg:flex-col">
        <Link to={isAuditor ? '/app/audit' : '/app/chats'} className="flex items-center gap-3 px-3 py-3">
          <div className="grid size-9 place-items-center rounded-lg bg-cyan-300 text-[#07111f]">
            <ShieldCheck className="size-5" />
          </div>
          <span className="font-mono font-bold">
            VAULT<span className="text-cyan-300">CORE</span>
          </span>
        </Link>
        <div className="mt-8 flex flex-col gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = location.pathname.startsWith(href)
            return (
              <Link
                key={href}
                to={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            )
          })}
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-cyan-900 text-xs font-semibold text-cyan-200">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.fullName || 'Member'}</p>
              <p className="font-mono text-[10px] uppercase text-muted-foreground capitalize">
                {user?.role || 'member'}
              </p>
            </div>
          </div>
        </div>
      </aside>
      <main className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-end gap-3 border-b border-border bg-background/95 px-5 backdrop-blur sm:px-8">
          <div className="flex flex-col items-end mr-1">
            <span className="text-sm font-medium">{user?.fullName || 'User'}</span>
            <span className="font-mono text-[10px] text-muted-foreground">{user?.email}</span>
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
