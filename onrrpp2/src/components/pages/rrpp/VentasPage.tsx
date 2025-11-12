import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { ventasService, type VentasStats } from '@/services/ventas.service'
import { eventosService } from '@/services/eventos.service'
import type { VentaConDetalles, Evento } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  TrendingUp,
  Users,
  Calendar,
  Tag,
  Crown,
  Ticket,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function VentasPage() {
  const { user } = useAuthStore()
  const [eventos, setEventos] = useState<Evento[]>([])
  const [selectedEvento, setSelectedEvento] = useState<string>('')
  const [ventas, setVentas] = useState<VentaConDetalles[]>([])
  const [stats, setStats] = useState<VentasStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEventos()
  }, [])

  useEffect(() => {
    if (selectedEvento && user) {
      loadVentas()
      loadStatsWithCommissions()
    }
  }, [selectedEvento, user])

  const loadEventos = async () => {
    const { data, error } = await eventosService.getEventos()
    if (error) {
      toast.error('Error al cargar eventos', {
        description: error.message,
      })
    } else if (data) {
      const eventosActivos = data.filter(e => e.estado)
      setEventos(eventosActivos)
      if (eventosActivos.length > 0) {
        setSelectedEvento(eventosActivos[0].id)
      }
    }
    setLoading(false)
  }

  const loadVentas = async () => {
    if (!user || !selectedEvento) return

    setLoading(true)
    try {
      const data = await ventasService.getVentasByRRPP(user.id, selectedEvento)
      setVentas(data)
    } catch (error) {
      toast.error('Error al cargar ventas', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      })
    }
    setLoading(false)
  }

  const loadStatsWithCommissions = async () => {
    if (!user || !selectedEvento) return

    try {
      const data = await ventasService.getVentasStatsWithCommissionsByRRPP(user.id, selectedEvento)
      setStats(data)
    } catch (error) {
      toast.error('Error al cargar estadísticas', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      })
    }
  }

  const getMetodoPagoBadgeColor = (metodo: string) => {
    switch (metodo) {
      case 'efectivo':
        return 'bg-green-500'
      case 'transferencia':
        return 'bg-blue-500'
      case 'mixto':
        return 'bg-purple-500'
      default:
        return 'bg-gray-500'
    }
  }

  const formatFecha = (fecha: string) => {
    try {
      return format(new Date(fecha), "dd/MM/yyyy HH:mm", { locale: es })
    } catch {
      return fecha
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Ventas</h1>
          <p className="text-muted-foreground">
            Estadísticas y detalle de tus ventas por evento
          </p>
        </div>
      </div>

      {/* Selector de evento */}
      <div className="max-w-md">
        <Select value={selectedEvento} onValueChange={setSelectedEvento}>
          <SelectTrigger>
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Seleccionar evento" />
          </SelectTrigger>
          <SelectContent>
            {eventos.map((evento) => (
              <SelectItem key={evento.id} value={evento.id}>
                {evento.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedEvento && stats && (
        <>
          {/* Tarjetas de comisiones */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Invitados Vendidos
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_ventas}</div>
                <p className="text-xs text-muted-foreground">
                  Invitados vendidos en este evento
                </p>
              </CardContent>
            </Card>

            <Card className="border-yellow-500 bg-gradient-to-r from-yellow-50 to-orange-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Tu Comisión Total
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  ${stats.comision_total !== undefined ? stats.comision_total.toFixed(2) : '0.00'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total de comisiones ganadas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Comisiones por lote */}
          {stats.ventas_por_lote && stats.ventas_por_lote.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Comisiones por Lote
                </CardTitle>
                <CardDescription>
                  Detalle de tus ganancias por cada tipo de lote vendido
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.ventas_por_lote.map((lote) => (
                    <div
                      key={lote.uuid_lote}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors space-y-3"
                    >
                      {/* Header del lote */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="font-semibold text-base">
                              {lote.lote_nombre}
                            </h4>
                            {lote.lote_es_vip ? (
                              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white gap-1 text-xs">
                                <Crown className="h-3 w-3" />
                                VIP
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1 text-xs">
                                <Ticket className="h-3 w-3" />
                                Normal
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xl md:text-2xl font-bold text-yellow-600">
                            ${Number(lote.comision_total).toFixed(2)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Total
                          </p>
                        </div>
                      </div>

                      {/* Detalles del lote */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Ventas:</span>
                          <span className="ml-1 font-medium">{lote.cantidad_ventas}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Precio:</span>
                          <span className="ml-1 font-medium">${Number(lote.lote_precio).toFixed(2)}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Comisión:</span>
                          <span className="ml-1 font-medium text-yellow-600">
                            {lote.comision_tipo === 'monto'
                              ? `$${Number(lote.comision_rrpp_monto).toFixed(2)} por venta`
                              : `${Number(lote.comision_rrpp_porcentaje).toFixed(2)}%`
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabla de ventas */}
          <Card>
            <CardHeader>
              <CardTitle>Detalle de Ventas</CardTitle>
              <CardDescription>
                Historial completo de tus ventas para este evento
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Cargando ventas...
                </div>
              ) : ventas.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-30" />
                  <p className="text-muted-foreground">
                    No hay ventas registradas para este evento
                  </p>
                </div>
              ) : (
                <>
                  {/* Vista desktop */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invitado</TableHead>
                          <TableHead>Evento / Lote</TableHead>
                          <TableHead>Método de Pago</TableHead>
                          <TableHead className="text-right">Efectivo</TableHead>
                          <TableHead className="text-right">Transferencia</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Fecha</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ventas.map((venta) => (
                          <TableRow key={venta.id}>
                            <TableCell className="font-medium">
                              <div>{venta.invitado.nombre} {venta.invitado.apellido}</div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-sm font-medium">{venta.evento.nombre}</div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">{venta.lote.nombre}</span>
                                  {venta.lote.es_vip ? (
                                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white gap-1 text-xs h-5">
                                      <Crown className="h-2.5 w-2.5" />
                                      VIP
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="gap-1 text-xs h-5">
                                      <Ticket className="h-2.5 w-2.5" />
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getMetodoPagoBadgeColor(venta.metodo_pago)}>
                                {venta.metodo_pago.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {venta.monto_efectivo > 0 ? (
                                <span className="text-green-600 font-medium">
                                  ${Number(venta.monto_efectivo).toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {venta.monto_transferencia > 0 ? (
                                <span className="text-blue-600 font-medium">
                                  ${Number(venta.monto_transferencia).toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              ${Number(venta.monto_total).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatFecha(venta.created_at)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Vista móvil */}
                  <div className="md:hidden space-y-4">
                    {ventas.map((venta) => (
                      <Card key={venta.id}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold">
                                  {venta.invitado.nombre} {venta.invitado.apellido}
                                </h3>
                                <p className="text-xs font-medium text-muted-foreground">
                                  {venta.evento.nombre}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-muted-foreground">
                                    {venta.lote.nombre}
                                  </p>
                                  {venta.lote.es_vip ? (
                                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white gap-1 text-xs h-4">
                                      <Crown className="h-2.5 w-2.5" />
                                      VIP
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="gap-1 text-xs h-4">
                                      <Ticket className="h-2.5 w-2.5" />
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Badge className={getMetodoPagoBadgeColor(venta.metodo_pago)}>
                                {venta.metodo_pago.toUpperCase()}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                              <div>
                                <p className="text-xs text-muted-foreground">Efectivo</p>
                                <p className="font-medium text-green-600">
                                  ${Number(venta.monto_efectivo).toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Transferencia</p>
                                <p className="font-medium text-blue-600">
                                  ${Number(venta.monto_transferencia).toFixed(2)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t">
                              <span className="text-sm font-bold">Total</span>
                              <span className="text-lg font-bold">
                                ${Number(venta.monto_total).toFixed(2)}
                              </span>
                            </div>

                            <div className="text-xs text-muted-foreground">
                              {formatFecha(venta.created_at)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedEvento && !loading && eventos.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="text-muted-foreground">
              No hay eventos activos disponibles
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
