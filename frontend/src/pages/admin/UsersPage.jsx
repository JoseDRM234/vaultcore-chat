import { useState, useEffect, useCallback } from 'react'
import { Search, UserPlus, MoreHorizontal, X, Shield, Check, Ban, AlertCircle, RefreshCw } from 'lucide-react'
import { usersService } from '@/services/vaultcore-api'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState(null)

  // Modal de creación / invitación
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'member',
  })
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState(null)

  // Menú de acción activo
  const [activeMenuId, setActiveMenuId] = useState(null)

  const fetchUsers = useCallback(async (query = '') => {
    try {
      setLoading(true)
      setError(null)
      const data = await usersService.list(query)
      setUsers(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, fetchUsers])

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setModalLoading(true)
    setModalError(null)
    try {
      await usersService.create(formData)
      setShowInviteModal(false)
      setFormData({ fullName: '', email: '', password: '', role: 'member' })
      fetchUsers(search)
    } catch (err) {
      setModalError(err.message)
    } finally {
      setModalLoading(false)
    }
  }

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active'
    try {
      await usersService.update(user.id, { status: newStatus })
      setActiveMenuId(null)
      fetchUsers(search)
    } catch (err) {
      alert(`Error actualizando estado del usuario: ${err.message}`)
    }
  }

  return (
    <div className="p-6 sm:p-10">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
          Admin / Directory
        </p>
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">User management</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage workspace access, roles, and cryptographic public keys.
            </p>
          </div>
          <button
            onClick={() => {
              setModalError(null)
              setShowInviteModal(true)
            }}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow hover:opacity-90 transition"
          >
            <UserPlus className="size-4" /> Invite user
          </button>
        </div>
      </header>

      {error && (
        <div className="mt-6 flex items-center gap-2 rounded-lg bg-rose-500/10 p-4 text-sm text-rose-500 border border-rose-500/20">
          <AlertCircle className="size-4" /> {error}
        </div>
      )}

      <div className="mt-8 flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <Search className="size-4 shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by name or email…"
          className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
        />
        {loading && <RefreshCw className="size-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              {['User', 'Role', 'Status', 'E2EE Key', ''].map((h) => (
                <th key={h} className="px-5 py-4 font-mono font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                  No se encontraron usuarios en el directorio.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition">
                <td className="px-5 py-4">
                  <p className="font-medium text-foreground">{u.fullName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground font-mono">{u.email}</p>
                </td>
                <td className="px-5 py-4">
                  <span className="capitalize font-mono text-xs rounded px-2 py-0.5 bg-muted text-foreground">
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      u.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  {u.publicKey ? (
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-cyan-600 dark:text-cyan-400">
                      <Shield className="size-3" /> SPKI Ready
                    </span>
                  ) : (
                    <span className="font-mono text-xs text-muted-foreground">Pending setup</span>
                  )}
                </td>
                <td className="px-5 py-4 text-right relative">
                  <button
                    onClick={() => setActiveMenuId(activeMenuId === u.id ? null : u.id)}
                    aria-label={`Actions for ${u.fullName}`}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>

                  {activeMenuId === u.id && (
                    <div className="absolute right-5 top-12 z-30 w-44 rounded-lg border border-border bg-card p-1 shadow-lg text-left">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`flex w-full items-center gap-2 rounded px-3 py-2 text-xs font-medium transition ${
                          u.status === 'active'
                            ? 'text-rose-500 hover:bg-rose-500/10'
                            : 'text-emerald-600 hover:bg-emerald-500/10'
                        }`}
                      >
                        {u.status === 'active' ? (
                          <>
                            <Ban className="size-3.5" /> Suspender acceso
                          </>
                        ) : (
                          <>
                            <Check className="size-3.5" /> Reactivar usuario
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Invitar / Crear Usuario */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h2 className="text-lg font-semibold">Invite new user</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-500 border border-rose-500/20">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Full name
                </label>
                <input
                  required
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Elena Rostova"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Corporate Email
                </label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="elena@vaultcore.test"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Temporary Password
                </label>
                <input
                  required
                  minLength={6}
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="At least 6 characters"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  System Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-cyan-500"
                >
                  <option value="member">Member (Encrypted chat & groups)</option>
                  <option value="admin">Admin (User & group management)</option>
                  <option value="auditor">Auditor (Read-only compliance audit)</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {modalLoading ? 'Creating…' : 'Create user'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
