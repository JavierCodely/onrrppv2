import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './components/pages/LoginPage'
import { themeService } from './services/theme.service'
import { Spinner } from './components/ui/spinner'

// Lazy load del dashboard y componentes protegidos
const DashboardRouter = lazy(() => import('./components/pages/DashboardRouter').then(module => ({ default: module.DashboardRouter })))
const ProtectedRoute = lazy(() => import('./components/organisms/ProtectedRoute').then(module => ({ default: module.ProtectedRoute })))

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
            <Suspense
              fallback={
                <div className="min-h-screen w-full flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <Spinner className="mx-auto h-8 w-8" />
                    <p className="text-muted-foreground">Cargando...</p>
                  </div>
                </div>
              }
            >
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            </Suspense>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
