import { Routes, Route, Navigate } from 'react-router-dom'
import { RRPPLayout } from '@/components/organisms/RRPPLayout'
import { EventosRRPPPage } from '@/components/pages/rrpp/EventosRRPPPage'
import { InvitadosPage } from '@/components/pages/rrpp/InvitadosPage'
import { VentasPage } from '@/components/pages/rrpp/VentasPage'

export function RRPPDashboard() {
  return (
    <RRPPLayout>
      <Routes>
        <Route index element={<EventosRRPPPage />} />
        <Route path="invitados" element={<InvitadosPage />} />
        <Route path="ventas" element={<VentasPage />} />
        <Route path="*" element={<Navigate to="/dashboard/rrpp" replace />} />
      </Routes>
    </RRPPLayout>
  )
}
