import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { AdminDashboard } from './AdminDashboard'
import { RRPPDashboard } from './RRPPDashboard'
import { SeguridadDashboard } from './SeguridadDashboard'

export function DashboardRouter() {
  const { user } = useAuthStore()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  switch (user.personal.rol) {
    case 'admin':
      return (
        <Routes>
          <Route path="admin/*" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/dashboard/admin" replace />} />
        </Routes>
      )
    case 'rrpp':
      return (
        <Routes>
          <Route path="rrpp/*" element={<RRPPDashboard />} />
          <Route path="*" element={<Navigate to="/dashboard/rrpp" replace />} />
        </Routes>
      )
    case 'seguridad':
      return (
        <Routes>
          <Route path="seguridad/*" element={<SeguridadDashboard />} />
          <Route path="*" element={<Navigate to="/dashboard/seguridad" replace />} />
        </Routes>
      )
    default:
      return <Navigate to="/login" replace />
  }
}
