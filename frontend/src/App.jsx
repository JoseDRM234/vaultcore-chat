import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
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

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Root Login */}
          <Route path="/" element={<LoginPage />} />

          {/* Admin Control Plane */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="groups" element={<GroupsPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="profile" element={<AdminProfile />} />
          </Route>

          {/* App Member & Auditor Interface */}
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="/app/chats" replace />} />
            <Route path="chats" element={<ChatsPage />} />
            <Route path="groups" element={<AppGroups />} />
            <Route path="audit" element={<AppAudit />} />
            <Route path="profile" element={<AppProfile />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
