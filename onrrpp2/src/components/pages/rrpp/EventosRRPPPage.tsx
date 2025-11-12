import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { eventosService, type EventoRRPPStats } from '@/services/eventos.service'
import { lotesService } from '@/services/lotes.service'
import { supabase } from '@/lib/supabase'
import type { Lote } from '@/types/database'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Calendar,
  Users,
  UserCheck,
  DollarSign,
  Crown,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function EventosRRPPPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [eventos, setEventos] = useState<EventoRRPPStats[]>([])
  const [loading, setLoading] = useState(true)
  const [lotesDialogOpen, setLotesDialogOpen] = useState(false)
  const [selectedEvento, setSelectedEvento] = useState<EventoRRPPStats | null>(null)
  const [lotes, setLotes] = useState<Lote[]>([])
  const [loadingLotes, setLoadingLotes] = useState(false)

  useEffect(() => {
    if (!user) return

    loadEventos()

    // Subscribir a cambios en invitados (para actualizar mis estadísticas)
    // Escuchamos TODOS los cambios en invitados (no solo los míos) porque cuando
    // seguridad escanea el QR, el id_rrpp sigue siendo mío pero el UPDATE lo hace seguridad
    const invitadosChannel = supabase
      .channel('invitados-rrpp-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invitados',
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('📡 Realtime cambio en invitados (RRPP):', payload)

          // Solo recargar si el cambio afecta a MIS invitados
          const invitado = payload.new || payload.old
          if (invitado && invitado.id_rrpp === user.id) {
            console.log('📡 Es mi invitado, recargando estadísticas...')
            loadEventos()
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción invitados (RRPP):', status)
      })

    // Cleanup al desmontar
    return () => {
      console.log('🔌 Desuscribiendo de invitados-rrpp-changes')
      invitadosChannel.unsubscribe()
    }
  }, [user])

  const loadEventos = async () => {
    if (!user) return

    setLoading(true)
    const { data, error } = await eventosService.getEventosRRPPStats(user.id)
    if (error) {
      toast.error('Error al cargar eventos', {
        description: error.message,
      })
    } else if (data) {
      // Filtrar solo eventos activos
      const eventosActivos = data.filter(e => e.evento_estado)
      setEventos(eventosActivos)
    }
    setLoading(false)
  }

  const handleOpenLotesDialog = async (evento: EventoRRPPStats) => {
    setSelectedEvento(evento)
    setLotesDialogOpen(true)
    setLoadingLotes(true)

    const { data, error } = await lotesService.getLotesDisponiblesByEvento(evento.evento_id)
    setLoadingLotes(false)

    if (error) {
      toast.error('Error al cargar lotes', {
        description: error.message,
      })
    } else if (data) {
      setLotes(data)
    }
  }

  const handleSelectLote = (lote: Lote) => {
    if (!selectedEvento) return

    // Navegar a crear invitado con lote preseleccionado usando URL params
    navigate(`/dashboard/rrpp/invitados?eventoId=${selectedEvento.evento_id}&loteId=${lote.id}`)
    setLotesDialogOpen(false)
  }

  const formatFecha = (fecha: string) => {
    try {
      const fechaFormateada = format(new Date(fecha), "EEEE d MMMM", { locale: es })
      return fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1)
    } catch {
      return fecha
    }
  }

  const formatHora = (fecha: string) => {
    try {
      return format(new Date(fecha), "HH:mm", { locale: es })
    } catch {
      return ''
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hola! {user?.personal.nombre} 👋</h1>
        <p className="text-muted-foreground">
          Selecciona un evento para crear invitados
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Cargando eventos...
        </div>
      ) : eventos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No hay eventos activos disponibles
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {eventos.map((evento) => (
            <Card
              key={evento.evento_id}
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleOpenLotesDialog(evento)}
            >
              {/* Banner */}
              {evento.evento_banner_url ? (
                <div className="w-full aspect-[2/1] bg-slate-100 dark:bg-slate-800">
                  <img
                    src={evento.evento_banner_url}
                    alt={evento.evento_nombre}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full aspect-[2/1] bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Calendar className="h-12 w-12 text-muted-foreground opacity-30" />
                </div>
              )}

              <CardContent className="p-4">
                <div className="space-y-3">
                  <h3 className="font-bold text-lg">{evento.evento_nombre}</h3>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Calendar className="h-4 w-4" />
                      {formatFecha(evento.evento_fecha)}
                    </div>
                    <div className="text-xs text-muted-foreground ml-6">
                      {formatHora(evento.evento_fecha)} hs
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{evento.mis_invitados}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      <span>{evento.mis_ingresados}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Lotes */}
      <Dialog open={lotesDialogOpen} onOpenChange={setLotesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lotes Disponibles</DialogTitle>
            <DialogDescription>
              Selecciona un lote para crear invitados
            </DialogDescription>
          </DialogHeader>

          {selectedEvento && (
            <div className="space-y-4 py-4">
              <div className="text-center pb-4 border-b">
                <h3 className="text-xl font-bold">{selectedEvento.evento_nombre}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatFecha(selectedEvento.evento_fecha)} - {formatHora(selectedEvento.evento_fecha)} hs
                </p>
              </div>

              {loadingLotes ? (
                <div className="text-center py-8 text-muted-foreground">
                  Cargando lotes...
                </div>
              ) : lotes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No hay lotes disponibles para este evento
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lotes.map((lote) => {
                    const disponibles = lote.cantidad_maxima - lote.cantidad_actual
                    const porcentaje = (lote.cantidad_actual / lote.cantidad_maxima) * 100

                    return (
                      <Card
                        key={lote.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleSelectLote(lote)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-lg">
                                  {lote.nombre}
                                </h4>
                                {lote.es_vip && (
                                  <Badge className="bg-yellow-500 gap-1">
                                    <Crown className="h-3 w-3" />
                                    VIP
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">
                                    {lote.precio === 0 ? 'GRATIS' : `$${lote.precio.toFixed(2)}`}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <span>
                                    {disponibles} / {lote.cantidad_maxima} disponibles
                                  </span>
                                </div>
                              </div>

                              {/* Barra de progreso */}
                              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    porcentaje > 80
                                      ? 'bg-red-500'
                                      : porcentaje > 50
                                      ? 'bg-yellow-500'
                                      : 'bg-green-500'
                                  }`}
                                  style={{ width: `${porcentaje}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setLotesDialogOpen(false)
                  setSelectedEvento(null)
                  setLotes([])
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Cerrar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
