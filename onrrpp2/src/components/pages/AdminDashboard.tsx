import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminLayout } from '@/components/organisms/AdminLayout'
import { DashboardPage } from '@/components/pages/admin/DashboardPage'
import { EventosPage } from '@/components/pages/admin/EventosPage'
import { VentasAdminPage } from '@/components/pages/admin/VentasAdminPage'
import { EmpleadosPage } from '@/components/pages/admin/EmpleadosPage'
import { ConfiguracionesPage } from '@/components/pages/admin/ConfiguracionesPage'
import { ConfiguracionPage } from '@/components/pages/ConfiguracionPage'

export function AdminDashboard() {
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<DashboardPage />} />
        <Route path="eventos" element={<EventosPage />} />
        <Route path="ventas" element={<VentasAdminPage />} />
        <Route path="empleados" element={<EmpleadosPage />} />
        <Route path="configuraciones" element={<ConfiguracionesPage />} />
        <Route path="tema" element={<ConfiguracionPage />} />
        <Route path="*" element={<Navigate to="/dashboard/admin" replace />} />
      </Routes>
    </AdminLayout>
  )
}
