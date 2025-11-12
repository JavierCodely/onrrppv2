import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './components/pages/LoginPage'
import { DashboardRouter } from './components/pages/DashboardRouter'
import { ProtectedRoute } from './components/organisms/ProtectedRoute'
import { themeService } from './services/theme.service'

function App() {
  useEffect(() => {
    // Inicializar tema al cargar la aplicación
    themeService.initTheme()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
