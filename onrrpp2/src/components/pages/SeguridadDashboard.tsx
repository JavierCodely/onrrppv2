import { SeguridadLayout } from '@/components/organisms/SeguridadLayout'
import { ScannerPage } from '@/components/pages/seguridad/ScannerPage'

export function SeguridadDashboard() {
  return (
    <SeguridadLayout>
      <ScannerPage />
    </SeguridadLayout>
  )
}
