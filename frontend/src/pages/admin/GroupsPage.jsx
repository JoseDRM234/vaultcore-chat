import { useState, useEffect } from 'react'
import { Plus, Users, Shield, Lock, X, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { channelsService, usersService } from '@/services/vaultcore-api'
import { useAuth } from '@/context/AuthContext'
import { generateChannelKey, encryptChannelKeyForMember } from '@/lib/crypto'

export default function GroupsPage() {
  const { user } = useAuth()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modal para crear grupo
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [policy, setPolicy] = useState('standard')
  const [availableUsers, setAvailableUsers] = useState([])
  const [selectedUserIds, setSelectedUserIds] = useState(new Set())
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)
  const [createSuccess, setCreateSuccess] = useState(null)

  useEffect(() => {
    let ignore = false

    async function loadGroups() {
      try {
        const data = await channelsService.list('group')
        if (!ignore) {
          setGroups(data)
          setLoading(false)
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message)
          setLoading(false)
        }
      }
    }

    loadGroups()

    return () => {
      ignore = true
    }
  }, [])

  const reloadGroups = async () => {
    try {
      setLoading(true)
      const data = await channelsService.list('group')
      setGroups(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = async () => {
    setShowCreateModal(true)
    setCreateError(null)
    setCreateSuccess(null)
    try {
      const usersList = await usersService.list()
      const active = usersList.filter((u) => u.status !== 'suspended')
      setAvailableUsers(active)
      if (user?.id) {
        setSelectedUserIds(new Set([user.id]))
      }
    } catch (err) {
      setCreateError('Error cargando usuarios: ' + err.message)
    }
  }

  const toggleUserSelection = (userId) => {
    if (userId === user?.id) return
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    if (!groupName.trim()) return

    setCreating(true)
    setCreateError(null)

    try {
      // 1. Generar clave simétrica AES-GCM del canal
      const channelKey = await generateChannelKey()

      // 2. Para cada miembro seleccionado, cifrar la clave del canal
      const membersPayload = []

      for (const memberId of selectedUserIds) {
        const u = availableUsers.find((x) => x.id === memberId)
        let pubKey = u?.publicKey
        if (!pubKey) {
          try {
            const keyData = await usersService.getPublicKey(memberId)
            pubKey = keyData?.publicKey
          } catch {
            // Usuario sin clave pública aún
          }
        }

        let encryptedKey = null
        if (pubKey) {
          try {
            encryptedKey = await encryptChannelKeyForMember(channelKey, pubKey)
          } catch (cryptErr) {
            console.warn(`No se pudo cifrar clave para el usuario ${memberId}:`, cryptErr)
          }
        }

        membersPayload.push({
          userId: memberId,
          role: memberId === user?.id ? 'owner' : 'member',
          encryptedChannelKey: encryptedKey,
        })
      }

      // 3. Crear el canal en la API
      await channelsService.create({
        name: groupName.trim(),
        type: 'group',
        policy,
        members: membersPayload,
      })

      setCreateSuccess('Grupo cifrado creado exitosamente.')
      setGroupName('')
      reloadGroups()
      setTimeout(() => setShowCreateModal(false), 1200)
    } catch (err) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6 sm:p-10">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
            Admin / Structure
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Group management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Control membership, policy, and end-to-end encryption channel distribution.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow hover:opacity-90 transition"
        >
          <Plus className="size-4" /> Create group
        </button>
      </header>

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
          <Users className="mx-auto size-10 text-muted-foreground" />
          <h3 className="mt-4 font-medium">No groups found</h3>
          <p className="mt-1 text-sm text-muted-foreground">Create your first encrypted group to start collaborating.</p>
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
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    Role: <span className="capitalize text-foreground font-medium">{group.role || 'member'}</span>
                  </p>
                </div>
                <span className="flex size-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500">
                  <Lock className="size-4" />
                </span>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
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

      {/* Modal Crear Grupo */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Lock className="size-5 text-cyan-500" /> Create encrypted group
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {createError && (
              <div className="mt-4 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-500 border border-rose-500/20">
                {createError}
              </div>
            )}

            {createSuccess && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-500 border border-emerald-500/20">
                <CheckCircle className="size-4" /> {createSuccess}
              </div>
            )}

            <form onSubmit={handleCreateGroup} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Group name
                </label>
                <input
                  required
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Incident Response Team"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Security policy
                </label>
                <select
                  value={policy}
                  onChange={(e) => setPolicy(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-cyan-500"
                >
                  <option value="standard">Standard (Audit logged)</option>
                  <option value="restricted">Restricted (High-security & zero persistence)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Select group members ({selectedUserIds.size} selected)
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  A unique AES-256-GCM key will be encrypted with each member's RSA public key.
                </p>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border bg-background p-1">
                  {availableUsers.map((u) => {
                    const isSelected = selectedUserIds.has(u.id)
                    const isCreator = u.id === user?.id
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleUserSelection(u.id)}
                        className={`flex items-center justify-between p-2.5 rounded cursor-pointer transition ${
                          isSelected ? 'bg-cyan-500/10' : 'hover:bg-muted'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-sm font-medium truncate">
                            {u.fullName} {isCreator && <span className="text-xs text-cyan-500 font-mono">(You)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground truncate font-mono">{u.email}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isCreator}
                          readOnly
                          className="size-4 accent-cyan-500"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !groupName.trim()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {creating ? 'Encrypting & Creating…' : 'Create & Encrypt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
