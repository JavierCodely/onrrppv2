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
  DollarSign,
  CreditCard,
  Banknote,
  TrendingUp,
  Users,
  Calendar,
  Wallet,
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
      loadStats()
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

  const loadStats = async () => {
    if (!user || !selectedEvento) return

    try {
      const data = await ventasService.getVentasStatsByRRPP(user.id, selectedEvento)
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
          {/* Tarjetas de estadísticas */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Ventas
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_ventas}</div>
                <p className="text-xs text-muted-foreground">
                  Invitados vendidos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Recaudado
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${stats.monto_total_general.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total general
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  En Efectivo
                </CardTitle>
                <Banknote className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${stats.monto_total_efectivo.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.total_efectivo} ventas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  En Transferencia
                </CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ${stats.monto_total_transferencia.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.total_transferencia + stats.total_mixto} ventas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Desglose por método de pago */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-green-600" />
                  Efectivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Ventas:</span>
                    <span className="font-semibold">{stats.total_efectivo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Monto:</span>
                    <span className="font-semibold text-green-600">
                      ${stats.monto_total_efectivo.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  Transferencia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Ventas:</span>
                    <span className="font-semibold">{stats.total_transferencia}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Transferencias:</span>
                    <span className="font-semibold text-blue-600">
                      ${stats.monto_total_transferencia.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-purple-600" />
                  Mixto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Ventas:</span>
                    <span className="font-semibold">{stats.total_mixto}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Combinación de efectivo y transferencia
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

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
                          <TableHead>Lote</TableHead>
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
                              <div className="text-sm">
                                {venta.lote.nombre}
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
                              <div>
                                <h3 className="font-semibold">
                                  {venta.invitado.nombre} {venta.invitado.apellido}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  {venta.lote.nombre}
                                </p>
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
