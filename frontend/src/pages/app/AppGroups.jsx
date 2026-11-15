import { useState, useEffect } from 'react'
import { UsersRound, Shield, Lock, RefreshCw, AlertCircle } from 'lucide-react'
import { channelsService } from '@/services/vaultcore-api'

export default function AppGroups() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadGroups() {
      try {
        setLoading(true)
        setError(null)
        const data = await channelsService.list('group')
        setGroups(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadGroups()
  }, [])

  return (
    <div className="p-6 sm:p-10">
      <p className="font-mono text-xs uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
        Workspace / Groups
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your groups</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Encrypted channel memberships distributed by workspace administrators.
      </p>

      {error && (
        <div className="mt-6 flex items-center gap-2 rounded-lg bg-rose-500/10 p-4 text-sm text-rose-500 border border-rose-500/20">
          <AlertCircle className="size-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="mt-12 flex justify-center py-10">
          <RefreshCw className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : groups.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
          <UsersRound className="mx-auto size-10 text-muted-foreground" />
          <h3 className="mt-4 font-medium">No group memberships</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            You have not been added to any encrypted groups yet.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <div
              key={group.id}
              className="rounded-xl border border-border bg-card p-5 transition hover:border-cyan-500/40"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">{group.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground font-mono">
                    Role: <span className="capitalize text-foreground font-medium">{group.role || 'member'}</span>
                  </p>
                </div>
                <span className="flex size-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500">
                  <Lock className="size-4" />
                </span>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  <Shield className="size-3" /> {group.policy || 'standard'}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {new Date(group.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
