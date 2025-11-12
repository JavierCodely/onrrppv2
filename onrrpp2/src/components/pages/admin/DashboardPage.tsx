import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  UserCheck,
  Calendar,
  Filter,
  MapPin,
  Clock,
  TrendingUp
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  analyticsService,
  type DashboardFilters,
  type DashboardStats,
  type HourlyIngresos,
  type LocationStats
} from '@/services/analytics.service'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>({})
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [hourlyData, setHourlyData] = useState<HourlyIngresos[]>([])
  const [locationData, setLocationData] = useState<LocationStats[]>([])
  const [loading, setLoading] = useState(true)

  // Opciones para filtros
  const [eventos, setEventos] = useState<Array<{ id: string; nombre: string }>>([])
  const [rrpps, setRRPPs] = useState<Array<{ id: string; nombre: string; apellido: string }>>([])
  const [departamentos, setDepartamentos] = useState<string[]>([])

  useEffect(() => {
    loadFilterOptions()
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [filters])

  // Realtime para actualizar dashboard cuando hay cambios en invitados
  useEffect(() => {
    console.log('📡 Configurando suscripción realtime para dashboard admin')

    const dashboardChannel = supabase
      .channel('dashboard-analytics')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'invitados',
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('📡 Realtime cambio en invitados (dashboard):', payload.eventType)

          // Verificar si el cambio afecta a los filtros actuales
          const invitadoAfectado = payload.new || payload.old
          let shouldUpdate = true

          if (invitadoAfectado) {
            // Si hay filtros activos, verificar si el cambio los afecta
            if (filters.eventoId && invitadoAfectado.uuid_evento !== filters.eventoId) {
              shouldUpdate = false
            }
            if (filters.rrppId && invitadoAfectado.id_rrpp !== filters.rrppId) {
              shouldUpdate = false
            }
            if (filters.sexo && invitadoAfectado.sexo !== filters.sexo) {
              shouldUpdate = false
            }
            if (filters.departamento && invitadoAfectado.departamento !== filters.departamento) {
              shouldUpdate = false
            }
          }

          // Solo recargar si el cambio afecta a los datos filtrados
          if (shouldUpdate) {
            console.log('📡 Recargando datos del dashboard...')
            await loadDashboardData()

            // Mostrar notificación sutil
            if (payload.eventType === 'INSERT') {
              toast.info('Nuevo invitado registrado', {
                description: 'Los datos se actualizaron automáticamente',
                duration: 2000,
              })
            } else if (payload.eventType === 'UPDATE' && invitadoAfectado?.ingresado) {
              toast.success('Nuevo ingreso detectado', {
                description: 'Los gráficos se actualizaron',
                duration: 2000,
              })
            } else if (payload.eventType === 'DELETE') {
              toast.info('Invitado eliminado', {
                description: 'Los datos se actualizaron',
                duration: 2000,
              })
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción dashboard:', status)
      })

    return () => {
      console.log('🔌 Desuscribiendo de dashboard-analytics')
      dashboardChannel.unsubscribe()
    }
  }, [filters])

  const loadFilterOptions = async () => {
    const [eventosRes, rrppsRes, deptosRes] = await Promise.all([
      analyticsService.getEventos(),
      analyticsService.getRRPPs(),
      analyticsService.getDepartamentos(),
    ])

    if (eventosRes.data) setEventos(eventosRes.data)
    if (rrppsRes.data) setRRPPs(rrppsRes.data)
    if (deptosRes.data) setDepartamentos(deptosRes.data)
  }

  const loadDashboardData = async () => {
    setLoading(true)

    const [statsRes, hourlyRes, locationRes] = await Promise.all([
      analyticsService.getDashboardStats(filters),
      analyticsService.getHourlyIngresos(filters),
      analyticsService.getLocationStats(filters, 'localidad'), // Agrupado por localidad (ciudades)
    ])

    if (statsRes.error) {
      toast.error('Error al cargar estadísticas', {
        description: statsRes.error.message,
      })
    } else {
      setStats(statsRes.data)
    }

    if (hourlyRes.data) setHourlyData(hourlyRes.data)
    if (locationRes.data) setLocationData(locationRes.data)

    setLoading(false)
  }

  const clearFilters = () => {
    setFilters({})
  }

  const hasActiveFilters = Object.keys(filters).length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Analytics</h1>
        <p className="text-muted-foreground">
          Análisis completo de eventos e invitados
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle>Filtros</CardTitle>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </div>
          <CardDescription>
            Filtra los datos por evento, RRPP, sexo o ubicación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtro por Evento */}
            <div className="space-y-2">
              <Label>Evento</Label>
              <Select
                value={filters.eventoId || 'ALL'}
                onValueChange={(value) =>
                  setFilters({ ...filters, eventoId: value === 'ALL' ? undefined : value })
                }
              >
                <SelectTrigger>
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Todos los eventos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los eventos</SelectItem>
                  {eventos.map((evento) => (
                    <SelectItem key={evento.id} value={evento.id}>
                      {evento.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por RRPP */}
            <div className="space-y-2">
              <Label>RRPP</Label>
              <Select
                value={filters.rrppId || 'ALL'}
                onValueChange={(value) =>
                  setFilters({ ...filters, rrppId: value === 'ALL' ? undefined : value })
                }
              >
                <SelectTrigger>
                  <Users className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Todos los RRPPs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los RRPPs</SelectItem>
                  {rrpps.map((rrpp) => (
                    <SelectItem key={rrpp.id} value={rrpp.id}>
                      {rrpp.nombre} {rrpp.apellido}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Sexo */}
            <div className="space-y-2">
              <Label>Sexo</Label>
              <Select
                value={filters.sexo || 'ALL'}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    sexo: value === 'ALL' ? undefined : value as 'hombre' | 'mujer'
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="hombre">Hombre</SelectItem>
                  <SelectItem value="mujer">Mujer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Departamento */}
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select
                value={filters.departamento || 'ALL'}
                onValueChange={(value) =>
                  setFilters({ ...filters, departamento: value === 'ALL' ? undefined : value })
                }
              >
                <SelectTrigger>
                  <MapPin className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los departamentos</SelectItem>
                  {departamentos.map((depto) => (
                    <SelectItem key={depto} value={depto}>
                      {depto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Badges de filtros activos */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
              {filters.eventoId && (
                <Badge variant="secondary">
                  Evento: {eventos.find(e => e.id === filters.eventoId)?.nombre}
                </Badge>
              )}
              {filters.rrppId && (
                <Badge variant="secondary">
                  RRPP: {rrpps.find(r => r.id === filters.rrppId)?.nombre}
                </Badge>
              )}
              {filters.sexo && (
                <Badge variant="secondary">
                  Sexo: {filters.sexo === 'hombre' ? 'Hombre' : 'Mujer'}
                </Badge>
              )}
              {filters.departamento && (
                <Badge variant="secondary">
                  Departamento: {filters.departamento}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPIs - Estadísticas generales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Total Invitados */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invitados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '-' : stats?.total_invitados.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Todos los invitados registrados
            </p>
          </CardContent>
        </Card>

        {/* Total Ingresados */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ingresados</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? '-' : stats?.total_ingresados.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.total_invitados && stats.total_invitados > 0
                ? `${((stats.total_ingresados / stats.total_invitados) * 100).toFixed(1)}% del total`
                : 'Sin datos'}
            </p>
          </CardContent>
        </Card>

        {/* Tasa de conversión */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Ingreso</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {loading || !stats?.total_invitados
                ? '-'
                : `${((stats.total_ingresados / stats.total_invitados) * 100).toFixed(1)}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              Porcentaje de invitados que ingresaron
            </p>
          </CardContent>
        </Card>
      </div>

      {/* KPIs - Por género */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Invitados Mujeres */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invitadas Mujeres</CardTitle>
            <Users className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-500">
              {loading ? '-' : stats?.total_invitados_mujeres.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        {/* Ingresadas Mujeres */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresadas Mujeres</CardTitle>
            <UserCheck className="h-4 w-4 text-pink-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">
              {loading ? '-' : stats?.total_ingresados_mujeres.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.total_invitados_mujeres && stats.total_invitados_mujeres > 0
                ? `${((stats.total_ingresados_mujeres / stats.total_invitados_mujeres) * 100).toFixed(1)}%`
                : '-'}
            </p>
          </CardContent>
        </Card>

        {/* Invitados Hombres */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invitados Hombres</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {loading ? '-' : stats?.total_invitados_hombres.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        {/* Ingresados Hombres */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresados Hombres</CardTitle>
            <UserCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {loading ? '-' : stats?.total_ingresados_hombres.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.total_invitados_hombres && stats.total_invitados_hombres > 0
                ? `${((stats.total_ingresados_hombres / stats.total_invitados_hombres) * 100).toFixed(1)}%`
                : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        {/* Gráfico de ingresos por hora */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <CardTitle>Ingresos por Hora</CardTitle>
            </div>
            <CardDescription>
              Distribución de ingresos a lo largo del día
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                Cargando datos...
              </div>
            ) : hourlyData.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                No hay datos de ingresos
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hora" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cantidad" fill="#3b82f6" name="Ingresos" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de ingresos por ubicación */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <CardTitle>Ingresos por Localidad</CardTitle>
            </div>
            <CardDescription>
              Top 10 localidades (ciudades) con más ingresos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                Cargando datos...
              </div>
            ) : locationData.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                No hay datos de ubicación
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={locationData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="ubicacion" type="category" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cantidad" fill="#10b981" name="Ingresos" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de distribución por género */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        {/* Gráfico de torta - Distribución por género */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>Distribución por Género (Ingresados)</CardTitle>
            </div>
            <CardDescription>
              Porcentaje de hombres y mujeres que ingresaron
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                Cargando datos...
              </div>
            ) : !stats || stats.total_ingresados === 0 ? (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                No hay datos de ingresos
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={[
                      {
                        name: 'Mujeres',
                        value: stats.total_ingresados_mujeres,
                        percentage: stats.total_ingresados > 0
                          ? ((stats.total_ingresados_mujeres / stats.total_ingresados) * 100).toFixed(1)
                          : '0'
                      },
                      {
                        name: 'Hombres',
                        value: stats.total_ingresados_hombres,
                        percentage: stats.total_ingresados > 0
                          ? ((stats.total_ingresados_hombres / stats.total_ingresados) * 100).toFixed(1)
                          : '0'
                      }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#ec4899" /> {/* Rosa para mujeres */}
                    <Cell fill="#3b82f6" /> {/* Azul para hombres */}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => [
                      `${value} (${props.payload.percentage}%)`,
                      name
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de barras comparativo - Género */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              <CardTitle>Comparativa Invitados vs Ingresados</CardTitle>
            </div>
            <CardDescription>
              Comparación por género entre invitados e ingresados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                Cargando datos...
              </div>
            ) : !stats ? (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                No hay datos disponibles
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={[
                    {
                      categoria: 'Mujeres',
                      Invitadas: stats.total_invitados_mujeres,
                      Ingresadas: stats.total_ingresados_mujeres,
                    },
                    {
                      categoria: 'Hombres',
                      Invitados: stats.total_invitados_hombres,
                      Ingresados: stats.total_ingresados_hombres,
                    }
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="categoria" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Invitadas" fill="#fbb6ce" name="Invitadas" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="Ingresadas" fill="#db2777" name="Ingresadas" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="Invitados" fill="#93c5fd" name="Invitados" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="Ingresados" fill="#2563eb" name="Ingresados" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
