import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { SocketProvider } from '@/context/SocketContext'
import { CryptoProvider } from '@/context/CryptoContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'

import LoginPage from '@/pages/LoginPage'
import AdminLayout from '@/layouts/AdminLayout'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import UsersPage from '@/pages/admin/UsersPage'
import GroupsPage from '@/pages/admin/GroupsPage'
import AuditPage from '@/pages/admin/AuditPage'
import AdminProfile from '@/pages/admin/AdminProfile'

import AppLayout from '@/layouts/AppLayout'
import ChatsPage from '@/pages/app/ChatsPage'
import AppGroups from '@/pages/app/AppGroups'
import AppAudit from '@/pages/app/AppAudit'
import AppProfile from '@/pages/app/AppProfile'

function LoginRoute() {
  const { isAuthenticated, user } = useAuth()
  if (isAuthenticated && user) {
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />
    if (user.role === 'auditor') return <Navigate to="/app/audit" replace />
    return <Navigate to="/app/chats" replace />
  }
  return <LoginPage />
}

function AppIndex() {
  const { user } = useAuth()
  if (user?.role === 'auditor') {
    return <Navigate to="/app/audit" replace />
  }
  return <Navigate to="/app/chats" replace />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <CryptoProvider>
            <BrowserRouter>
              <Routes>
                {/* Root Login */}
                <Route path="/" element={<LoginRoute />} />

                {/* Admin Control Plane (Strict Role: ADMIN) */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="groups" element={<GroupsPage />} />
                  <Route path="audit" element={<AuditPage />} />
                  <Route path="profile" element={<AdminProfile />} />
                </Route>

                {/* App Interface (Roles: MEMBER, AUDITOR, ADMIN) */}
                <Route
                  path="/app"
                  element={
                    <ProtectedRoute allowedRoles={['member', 'auditor', 'admin']}>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AppIndex />} />
                  <Route
                    path="chats"
                    element={
                      <ProtectedRoute allowedRoles={['member', 'admin']}>
                        <ChatsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="groups"
                    element={
                      <ProtectedRoute allowedRoles={['member', 'admin']}>
                        <AppGroups />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="audit"
                    element={
                      <ProtectedRoute allowedRoles={['auditor', 'admin']}>
                        <AppAudit />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="profile" element={<AppProfile />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </CryptoProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
