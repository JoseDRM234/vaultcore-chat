import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export function ProtectedRoute({ children, allowedRoles }) {
  const { token, user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <p className="font-mono text-xs uppercase tracking-widest text-slate-400">Verificando credenciales…</p>
        </div>
      </div>
    )
  }

  if (!token || !user) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirigir según el rol del usuario si no tiene permiso
    const defaultRoute =
      user.role === 'admin'
        ? '/admin/dashboard'
        : user.role === 'auditor'
          ? '/app/audit'
          : '/app/chats'

    return <Navigate to={defaultRoute} replace />
  }

  return children
}
