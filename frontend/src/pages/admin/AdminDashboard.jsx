import { useState, useEffect } from 'react'
import { Activity, ArrowUpRight, ShieldAlert, Users, Network, Clock3, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { adminService } from '@/services/vaultcore-api'
import { useAuth } from '@/context/AuthContext'

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    activeUsers: 0,
    encryptedGroups: 0,
    auditEvents: 0,
    totalMessages: 0,
    systemStatus: 'operational',
    environment: 'development',
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let ignore = false

    async function loadStats() {
      try {
        const data = await adminService.getStats()
        if (!ignore) {
          setStats(data)
          setLoading(false)
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message)
          setLoading(false)
        }
      }
    }

    loadStats()

    return () => {
      ignore = true
    }
  }, [])

  const handleRefresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.getStats()
      setStats(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      label: 'Active users',
      value: loading ? '—' : stats.activeUsers.toLocaleString(),
      change: 'Workspace members',
      icon: Users,
      link: '/admin/users',
    },
    {
      label: 'Encrypted groups',
      value: loading ? '—' : stats.encryptedGroups.toLocaleString(),
      change: 'E2EE active channels',
      icon: Network,
      link: '/admin/groups',
    },
    {
      label: 'Audit events',
      value: loading ? '—' : stats.auditEvents.toLocaleString(),
      change: 'Immutable security log',
      icon: Activity,
      link: '/admin/audit',
    },
  ]

  const firstName = user?.fullName?.split(' ')[0] || 'Administrator'

  return (
    <div>
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-5 sm:px-10">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
            Admin / Overview
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Welcome back, {firstName}
          </h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="capitalize font-mono text-xs">
            {stats.systemStatus} · {stats.environment}
          </span>
          <button
            onClick={handleRefresh}
            title="Refresh statistics"
            className="p-1 rounded-md hover:bg-accent text-muted-foreground"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <div className="p-6 sm:p-10">
        {error && (
          <div className="mb-6 rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-500">
            Error cargando métricas: {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {statCards.map(({ label, value, change, icon: Icon, link }) => (
            <Link
              key={label}
              to={link}
              className="rounded-xl border border-border bg-card p-5 transition hover:border-cyan-500/50 block"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                <Icon className="size-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              <p className="mt-5 text-3xl font-semibold tracking-tight">{value}</p>
              <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">{change}</p>
            </Link>
          ))}
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Security activity</h2>
                <p className="mt-1 text-sm text-muted-foreground">Total messages & audit events registered</p>
              </div>
              <Link
                to="/admin/audit"
                className="flex items-center gap-1 text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                View audit <ArrowUpRight className="size-4" />
              </Link>
            </div>
            <div className="mt-8 flex h-44 items-end gap-3 border-b border-border pb-0">
              {[42, 58, 48, 70, 64, 82, 76, 92, 68, 88, 95, 80].map((height, index) => (
                <div key={index} className="flex flex-1 flex-col justify-end gap-2">
                  <div style={{ height: `${height}%` }} className="rounded-t bg-cyan-400/30" />
                  <span className="font-mono text-[10px] text-muted-foreground">{index + 1}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>Total ciphertexts routed: {stats.totalMessages}</span>
              <span>Audit events in store: {stats.auditEvents}</span>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-semibold">Security Governance</h2>
            <div className="mt-5 flex flex-col gap-4">
              <div className="flex gap-3 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                <ShieldAlert className="size-4 shrink-0 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Zero-Knowledge Enforced</p>
                  <p className="mt-1 text-xs text-muted-foreground">Private keys are never stored on server.</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-3">
                <Clock3 className="size-4 shrink-0 text-cyan-500" />
                <div>
                  <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400">Web Crypto E2EE Active</p>
                  <p className="mt-1 text-xs text-muted-foreground">AES-256-GCM + RSA-OAEP 2048-bit keys.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
