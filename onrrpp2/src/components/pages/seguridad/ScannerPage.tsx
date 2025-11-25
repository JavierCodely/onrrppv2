import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '@/services/auth.service'
import { invitadosService } from '@/services/invitados.service'
import type { InvitadoConDetalles } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  ScanLine,
  MapPin,
  CheckCircle2,
  Crown,
  Ticket,
  AlertCircle,
  X,
} from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { motion, AnimatePresence } from 'framer-motion'

export function ScannerPage() {
  const { user, signOut } = useAuthStore()
  const [scanning, setScanning] = useState(false)
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null)
  const [invitado, setInvitado] = useState<InvitadoConDetalles | null>(null)
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [showErrorAnimation, setShowErrorAnimation] = useState(false)
  const [showInvalidQRAnimation, setShowInvalidQRAnimation] = useState(false)
  const [countdown, setCountdown] = useState(0) // Contador para mostrar al usuario

  // Usar useRef para bandera inmediata (no espera re-render)
  const isProcessingRef = useRef(false)

  useEffect(() => {
    return () => {
      if (scanner) {
        scanner.stop().catch(() => {})
      }
    }
  }, [scanner])

  const startScanner = useCallback(async () => {
    console.log('🎬 startScanner llamado')
    console.log('📊 Estado - scanning:', scanning, 'scanner:', scanner, 'isProcessingRef:', isProcessingRef.current)

    try {
      // Verificar si ya hay un scanner activo
      if (scanner) {
        console.log('⚠️ Scanner ya activo, ignorando')
        return
      }

      // Activar estado scanning para que React renderice el elemento
      if (!scanning) {
        console.log('📺 Activando estado scanning')
        setScanning(true)
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      // Verificar elemento después de renderizar
      const readerElement = document.getElementById('reader')
      console.log('🔍 Elemento reader:', !!readerElement)

      if (!readerElement) {
        console.error('❌ Elemento #reader no encontrado')
        setScanning(false)
        return
      }

      console.log('🔨 Creando Html5Qrcode')
      const html5QrCode = new Html5Qrcode('reader')

      console.log('📸 Iniciando cámara...')
      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          console.log('📷 QR detectado:', decodedText)
          await handleQRDetected(decodedText)
        },
        () => {
          // Error de escaneo (ignorar)
        }
      )

      console.log('✅ Scanner OK')
      setScanner(html5QrCode)
    } catch (err: any) {
      console.error('❌ Error:', err)
      setScanning(false)
      setScanner(null)
      toast.error('Error al iniciar cámara', {
        description: err?.message || 'Verifica los permisos',
      })
    }
  }, [scanning, scanner])

  const stopScanner = async () => {
    if (scanner) {
      try {
        await scanner.stop()
      } catch (err) {
        console.error('Error al detener scanner:', err)
      } finally {
        setScanning(false)
        setScanner(null)
      }
    }
  }

  const handleQRDetected = async (qrCode: string) => {
    // Verificar con useRef (inmediato, sin esperar re-render)
    if (isProcessingRef.current) {
      console.log('⛔ Ya procesando, IGNORANDO completamente')
      return
    }

    console.log('✅ QR detectado:', qrCode)

    // Marcar INMEDIATAMENTE como procesando
    isProcessingRef.current = true
    console.log('🔒 isProcessingRef = true')

    // VERIFICAR SI EL USUARIO ESTÁ ACTIVO
    if (user) {
      const { isActive, error } = await authService.checkUserActive(user.id)

      if (error) {
        console.error('❌ Error al verificar estado del usuario:', error)
        toast.error('Error al verificar estado del usuario', {
          description: error.message,
        })
        isProcessingRef.current = false
        return
      }

      if (!isActive) {
        console.log('⛔ Usuario inactivo detectado')
        toast.error('Usuario inactivo', {
          description: 'Tu cuenta ha sido desactivada. Contacta con un administrador.',
        })

        // Detener el scanner si está activo
        if (scanner) {
          try {
            const state = scanner.getState()
            if (state === 2) {
              await scanner.stop()
            }
          } catch (err) {
            console.error('⚠️ Error al detener scanner:', err)
          }
          setScanning(false)
          setScanner(null)
        }

        // Cerrar sesión con razón (sin recargar)
        await signOut('Tu cuenta ha sido deshabilitada, contacta con un administrador')
        return
      }
    }

    // PASO 1: Detener el scanner inmediatamente
    console.log('🛑 Deteniendo scanner AHORA...')
    if (scanner) {
      try {
        // Verificar si el scanner está corriendo antes de detenerlo
        const state = scanner.getState()
        if (state === 2) { // 2 = Html5QrcodeScannerState.SCANNING
          await scanner.stop()
          console.log('✅ Scanner detenido')
        } else {
          console.log('ℹ️ Scanner ya estaba detenido (estado: ' + state + ')')
        }
      } catch (err) {
        console.error('⚠️ Error al detener:', err)
      }
      setScanning(false)
      setScanner(null)
    }

    // PASO 2: Consultar información del invitado
    const { data, error } = await invitadosService.getInvitadoByQR(qrCode)

    if (error || !data) {
      // Mostrar modal de QR inválido
      setShowInvalidQRAnimation(true)
      // NO reiniciar automáticamente - esperar a que cierre el modal
      return
    }

    // PASO 3: Mostrar información
    setInvitado(data)

    // Si es VIP, permitir múltiples escaneos
    const esVip = data.lote?.es_vip || false

    if (esVip) {
      // VIP: Siempre mostrar información, escanear múltiples veces
      if (!data.ingresado) {
        // Primera vez del VIP
        await marcarIngresoAutomatico(data)
      } else {
        // VIP ya ingresado, solo mostrar info
        setShowSuccessAnimation(true)
      }
    } else {
      // NO VIP: Solo una vez
      if (data.ingresado) {
        // Ya ingresado - mostrar error en rojo
        setShowErrorAnimation(true)
      } else {
        // Primera vez - marcar ingreso
        await marcarIngresoAutomatico(data)
      }
    }
  }

  const marcarIngresoAutomatico = async (invitadoData: InvitadoConDetalles) => {
    const { error } = await invitadosService.marcarIngreso(invitadoData.qr_code)

    if (error) {
      toast.error('Error al marcar ingreso', {
        description: error.message,
      })
      // Si hay error, reiniciar scanner
      isProcessingRef.current = false
      await startScanner()
      return
    }

    // Actualizar estado y mostrar modal
    setInvitado({ ...invitadoData, ingresado: true, fecha_ingreso: new Date().toISOString() })
    setShowSuccessAnimation(true)
    // NO cerrar automáticamente - solo con el botón X
  }

  const handleNuevoEscaneo = useCallback(async () => {
    console.log('🔄 Iniciando proceso de nuevo escaneo...')

    // PASO 1: Cerrar modales
    setShowSuccessAnimation(false)
    setShowErrorAnimation(false)
    setShowInvalidQRAnimation(false)
    setInvitado(null)

    // PASO 2: Resetear completamente (ignorar errores de limpieza)
    try {
      if (scanner) {
        scanner.clear()
      }
    } catch (e) {
      console.log('Ignorando error de limpieza')
    }

    setScanner(null)
    setScanning(false)
    isProcessingRef.current = false

    console.log('✅ Estados reseteados')

    // PASO 3: Countdown visual de 2 segundos
    setCountdown(2)
    await new Promise(resolve => setTimeout(() => { setCountdown(1); resolve(undefined) }, 1000))
    await new Promise(resolve => setTimeout(() => { setCountdown(0); resolve(undefined) }, 1000))

    // PASO 4: Esperar un poco más para que React actualice
    await new Promise(resolve => setTimeout(resolve, 500))

    // PASO 5: Forzar reinicio llamando a startScanner con estados limpios
    console.log('🎬 Llamando a startScanner...')
    setScanning(true)
    await new Promise(resolve => setTimeout(resolve, 300))

    const readerElement = document.getElementById('reader')
    if (!readerElement) {
      console.error('❌ No se encontró elemento reader')
      setScanning(false)
      return
    }

    try {
      const html5QrCode = new Html5Qrcode('reader')

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          await handleQRDetected(decodedText)
        },
        () => {}
      )

      setScanner(html5QrCode)
      console.log('✅ Cámara reiniciada exitosamente')
    } catch (err: any) {
      console.error('❌ Error:', err)
      setScanning(false)
      setScanner(null)
      toast.error('Error al reiniciar cámara', {
        description: err?.message || 'Intenta nuevamente',
      })
    }
  }, [scanner])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Escanear QR</h1>
        <p className="text-muted-foreground">
          Escanea el QR de los invitados para marcar su ingreso
        </p>
      </div>

      {/* Escáner - SIEMPRE visible pero oculto cuando hay modal */}
      <Card className={showSuccessAnimation || showErrorAnimation || showInvalidQRAnimation ? 'hidden' : ''}>
        <CardHeader>
          <CardTitle>Escáner de QR</CardTitle>
          <CardDescription>
            {countdown > 0
              ? `Aleje el código QR... Reiniciando en ${countdown}s`
              : !scanning
              ? 'Presiona el botón para iniciar el escáner'
              : 'Apunta la cámara al código QR del invitado'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {countdown > 0 ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="text-6xl font-bold text-blue-600 animate-pulse">
                {countdown}
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Por favor, aleje el código QR de la cámara
              </p>
            </div>
          ) : !scanning ? (
            <Button
              onClick={startScanner}
              className="w-full gap-2"
              size="lg"
            >
              <ScanLine className="h-5 w-5" />
              Iniciar Escáner
            </Button>
          ) : (
            <>
              <div
                id="reader"
                className="rounded-lg overflow-hidden border"
              ></div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <ScanLine className="h-4 w-4 animate-pulse" />
                <span>Buscando código QR...</span>
              </div>
              <Button
                onClick={stopScanner}
                variant="outline"
                className="w-full"
              >
                Detener Escáner
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Animaciones y resultados */}
      <AnimatePresence>
        {showSuccessAnimation && invitado && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <Card className="w-full max-w-md mx-4 border-green-500 border-2 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-lg"
                onClick={() => {
                  setShowSuccessAnimation(false)
                  handleNuevoEscaneo()
                }}
              >
                <X className="h-5 w-5 text-gray-700" />
              </Button>
              <CardContent className="pt-6">
                {/* Animación de check */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="flex justify-center mb-6"
                >
                  <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle2 className="h-16 w-16 text-white" />
                  </div>
                </motion.div>

                {/* Foto de perfil (solo VIP) */}
                {invitado.lote?.es_vip && invitado.profile_image_url && (
                  <div className="flex justify-center mb-6">
                    <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-green-500 shadow-xl">
                      <img
                        src={invitado.profile_image_url}
                        alt={`${invitado.nombre} ${invitado.apellido}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Información del invitado */}
                <div className="space-y-4 text-center">
                  <div>
                    <h2 className="text-3xl font-bold text-green-600">
                      ¡Ingreso Exitoso!
                    </h2>
                  </div>

                  <div className="space-y-2">
                    <p className="text-2xl font-bold">
                      {invitado.nombre} {invitado.apellido}
                    </p>

                    {invitado.lote && (
                      <div className="flex items-center justify-center gap-2">
                        {invitado.lote.es_vip ? (
                          <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white gap-1">
                            <Crown className="h-3 w-3" />
                            VIP - {invitado.lote.nombre}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <Ticket className="h-3 w-3" />
                            {invitado.lote.nombre}
                          </Badge>
                        )}
                      </div>
                    )}

                    {invitado.edad && (
                      <p className="text-lg text-muted-foreground">
                        {invitado.edad} años
                      </p>
                    )}

                    {(invitado.departamento || invitado.localidad) && (
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {invitado.localidad && invitado.departamento
                            ? `${invitado.localidad}, ${invitado.departamento}`
                            : invitado.localidad || invitado.departamento}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Botón para cerrar y continuar escaneando */}
                  <Button
                    onClick={handleNuevoEscaneo}
                    size="lg"
                    className="w-full mt-8 bg-green-600 hover:bg-green-700 text-white text-lg py-6"
                  >
                    Continuar Escaneando
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {showErrorAnimation && invitado && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <Card className="w-full max-w-md mx-4 border-red-500 border-2 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-lg"
                onClick={() => {
                  setShowErrorAnimation(false)
                  handleNuevoEscaneo()
                }}
              >
                <X className="h-5 w-5 text-gray-700" />
              </Button>
              <CardContent className="pt-6">
                {/* Animación de error */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="flex justify-center mb-6"
                >
                  <div className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center">
                    <AlertCircle className="h-16 w-16 text-white" />
                  </div>
                </motion.div>

                {/* Información del invitado */}
                <div className="space-y-4 text-center">
                  <div>
                    <h2 className="text-3xl font-bold text-red-600">
                      ¡Invitado Ya Ingresado!
                    </h2>
                  </div>

                  <div className="space-y-2">
                    <p className="text-2xl font-bold">
                      {invitado.nombre} {invitado.apellido}
                    </p>

                    {invitado.edad && (
                      <p className="text-lg text-muted-foreground">
                        {invitado.edad} años
                      </p>
                    )}

                    {(invitado.departamento || invitado.localidad) && (
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {invitado.localidad && invitado.departamento
                            ? `${invitado.localidad}, ${invitado.departamento}`
                            : invitado.localidad || invitado.departamento}
                        </span>
                      </div>
                    )}

                    {invitado.fecha_ingreso && (
                      <p className="text-sm text-muted-foreground mt-4">
                        Ingresó el {new Date(invitado.fecha_ingreso).toLocaleString('es-AR', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    )}
                  </div>

                  {/* Botón para cerrar y continuar escaneando */}
                  <Button
                    onClick={handleNuevoEscaneo}
                    size="lg"
                    className="w-full mt-8 bg-red-600 hover:bg-red-700 text-white text-lg py-6"
                  >
                    Continuar Escaneando
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {showInvalidQRAnimation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <Card className="w-full max-w-md mx-4 border-red-500 border-2 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-lg"
                onClick={() => {
                  setShowInvalidQRAnimation(false)
                  handleNuevoEscaneo()
                }}
              >
                <X className="h-5 w-5 text-gray-700" />
              </Button>
              <CardContent className="pt-6">
                {/* Animación de error */}
                <motion.div
                  initial={{ scale: 0, rotate: 0 }}
                  animate={{ scale: 1, rotate: [0, -10, 10, -10, 0] }}
                  transition={{
                    scale: { type: 'spring', stiffness: 200, damping: 15 },
                    rotate: { duration: 0.5, delay: 0.2 }
                  }}
                  className="flex justify-center mb-6"
                >
                  <div className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center">
                    <X className="h-16 w-16 text-white stroke-[3]" />
                  </div>
                </motion.div>

                {/* Mensaje de error */}
                <div className="space-y-4 text-center">
                  <div>
                    <h2 className="text-3xl font-bold text-red-600">
                      ¡QR Inválido!
                    </h2>
                  </div>

                  <div className="space-y-2">
                    <p className="text-lg text-muted-foreground">
                      El código QR escaneado no corresponde a ningún invitado registrado
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Por favor, verifica que el código QR sea correcto
                    </p>
                  </div>

                  {/* Botón para cerrar y continuar escaneando */}
                  <Button
                    onClick={handleNuevoEscaneo}
                    size="lg"
                    className="w-full mt-8 bg-red-600 hover:bg-red-700 text-white text-lg py-6"
                  >
                    Continuar Escaneando
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
