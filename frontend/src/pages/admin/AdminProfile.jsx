import { useAuth } from '@/context/AuthContext'
import { ShieldCheck, Key } from 'lucide-react'

function getInitials(name) {
  if (!name) return 'AD'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function AdminProfile() {
  const { user } = useAuth()
  const initials = getInitials(user?.fullName)

  return (
    <div className="p-6 sm:p-10">
      <p className="font-mono text-xs uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
        Admin / Account
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your profile</h1>
      <div className="mt-8 max-w-xl rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-lg">{user?.fullName || 'Administrator'}</p>
            <p className="text-sm text-muted-foreground capitalize">{user?.role} · Northstar workspace</p>
          </div>
        </div>
        <div className="mt-8 grid gap-4">
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Full name
            </label>
            <input
              readOnly
              value={user?.fullName || ''}
              className="mt-1 w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm outline-none font-medium"
            />
          </div>
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Email
            </label>
            <input
              readOnly
              value={user?.email || ''}
              className="mt-1 w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm outline-none font-mono"
            />
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-4">
          <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-medium text-sm">
            <Key className="size-4" /> Cryptographic Identity
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {user?.publicKey ? (
              <span className="flex items-center gap-1 mt-1 text-emerald-600 dark:text-emerald-400 font-mono">
                <ShieldCheck className="size-3.5" /> RSA-OAEP 2048-bit key registered and active
              </span>
            ) : (
              'Key generation in progress'
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
