import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { eventosService } from '@/services/eventos.service'
import { storageService } from '@/services/storage.service'
import { lotesService } from '@/services/lotes.service'
import { supabase } from '@/lib/supabase'
import type { Evento, Lote } from '@/types/database'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { CreateLoteDTO, UpdateLoteDTO } from '@/services/lotes.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import {
  Plus,
  Calendar,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Users,
  UserCheck,
  Upload,
  X,
  Image as ImageIcon,
  Tag,
  Crown,
  Ticket,
  DollarSign,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function EventosPage() {
  const { user } = useAuthStore()
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    fecha: '',
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estados para gestión de lotes
  const [lotesDialogOpen, setLotesDialogOpen] = useState(false)
  const [loteFormDialogOpen, setLoteFormDialogOpen] = useState(false)
  const [lotes, setLotes] = useState<Lote[]>([])
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null)
  const [loteFormData, setLoteFormData] = useState({
    nombre: '',
    cantidad_maxima: '',
    precio: '',
    es_vip: false,
  })
  const [deleteLoteDialogOpen, setDeleteLoteDialogOpen] = useState(false)

  useEffect(() => {
    loadEventos()

    // Subscribir a cambios en eventos (para actualizar total_invitados y total_ingresados)
    const eventosChannel = supabase
      .channel('eventos-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'eventos',
        },
        (payload: RealtimePostgresChangesPayload<Evento>) => {
          console.log('📡 Realtime UPDATE recibido en eventos:', payload)
          const eventoActualizado = payload.new as Evento

          setEventos((prevEventos) =>
            prevEventos.map((evento) =>
              evento.id === eventoActualizado.id
                ? { ...evento, total_invitados: eventoActualizado.total_invitados, total_ingresados: eventoActualizado.total_ingresados }
                : evento
            )
          )
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción eventos:', status)
      })

    // Cleanup al desmontar
    return () => {
      console.log('🔌 Desuscribiendo de eventos-changes')
      eventosChannel.unsubscribe()
    }
  }, [])

  const loadEventos = async () => {
    setLoading(true)
    const { data, error } = await eventosService.getEventos()
    if (error) {
      toast.error('Error al cargar eventos', {
        description: error.message,
      })
    } else if (data) {
      setEventos(data)
    }
    setLoading(false)
  }

  const handleOpenDialog = (evento?: Evento) => {
    if (evento) {
      setSelectedEvento(evento)
      // Convertir la fecha al formato datetime-local (YYYY-MM-DDTHH:mm)
      const fechaLocal = new Date(evento.fecha)
      const fechaFormateada = new Date(fechaLocal.getTime() - fechaLocal.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)

      setFormData({
        nombre: evento.nombre,
        fecha: fechaFormateada,
      })
      // Si hay banner existente, mostrarlo en el preview
      if (evento.banner_url) {
        setPreviewUrl(evento.banner_url)
      } else {
        setPreviewUrl(null)
      }
      setSelectedFile(null)
    } else {
      // Limpiar todo al crear nuevo evento
      setSelectedEvento(null)
      setFormData({
        nombre: '',
        fecha: '',
      })
      setPreviewUrl(null)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedEvento(null)
    setFormData({ nombre: '', fecha: '' })
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar archivo
    const validation = storageService.validateImageFile(file)
    if (!validation.valid) {
      toast.error('Archivo inválido', {
        description: validation.error,
      })
      return
    }

    setSelectedFile(file)

    // Crear preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    setUploading(true)

    try {
      let bannerUrl: string | null = null

      // Si hay archivo seleccionado, subirlo
      if (selectedFile) {
        if (selectedEvento) {
          // Actualizar: reemplazar banner viejo
          const { data, error } = await storageService.updateEventBanner(
            selectedFile,
            user.club.id,
            selectedEvento.id,
            selectedEvento.banner_url
          )
          if (error) throw error
          bannerUrl = data?.url || null
        } else {
          // Crear: subir banner temporal
          const { data, error } = await storageService.uploadEventBanner(
            selectedFile,
            user.club.id
          )
          if (error) throw error
          bannerUrl = data?.url || null
        }
      } else if (selectedEvento) {
        // Si estamos editando y no hay archivo nuevo, mantener el banner existente
        bannerUrl = selectedEvento.banner_url
      }

      const eventoData = {
        nombre: formData.nombre.trim(),
        fecha: new Date(formData.fecha).toISOString(),
        banner_url: bannerUrl,
      }

      if (selectedEvento) {
        // Actualizar
        const { error } = await eventosService.updateEvento(
          selectedEvento.id,
          eventoData
        )
        if (error) throw error
        toast.success('Evento actualizado correctamente')
      } else {
        // Crear
        const { error } = await eventosService.createEvento(eventoData, user.id)
        if (error) throw error
        toast.success('Evento creado correctamente')
      }

      handleCloseDialog()
      loadEventos()
    } catch (error) {
      toast.error('Error al guardar evento', {
        description: (error as Error).message,
      })
    } finally {
      setUploading(false)
    }
  }

  const handleToggleEstado = async (evento: Evento) => {
    const { error } = await eventosService.toggleEstado(evento.id, !evento.estado)
    if (error) {
      toast.error('Error al cambiar estado', {
        description: error.message,
      })
    } else {
      toast.success(
        evento.estado ? 'Evento desactivado' : 'Evento activado'
      )
      loadEventos()
    }
  }

  const handleDelete = async () => {
    if (!selectedEvento) return

    try {
      // Eliminar banner si existe
      if (selectedEvento.banner_url) {
        await storageService.deleteBannerByUrl(selectedEvento.banner_url)
      }

      // Eliminar evento
      const { error } = await eventosService.deleteEvento(selectedEvento.id)
      if (error) throw error

      toast.success('Evento eliminado correctamente')
      setDeleteDialogOpen(false)
      setSelectedEvento(null)
      loadEventos()
    } catch (error) {
      toast.error('Error al eliminar evento', {
        description: (error as Error).message,
      })
    }
  }

  const formatFecha = (fecha: string, tipo: 'completo' | 'card' = 'completo') => {
    try {
      if (tipo === 'card') {
        // Formato para cards: "Sábado 9 diciembre"
        const fechaFormateada = format(new Date(fecha), "EEEE d MMMM", { locale: es })
        // Capitalizar primera letra
        return fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1)
      }
      // Formato completo para tabla
      return format(new Date(fecha), "d 'de' MMMM yyyy, HH:mm", { locale: es })
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

  // ==================== FUNCIONES PARA LOTES ====================

  const loadLotes = async (eventoId: string) => {
    const { data, error } = await lotesService.getLotesByEvento(eventoId)
    if (error) {
      toast.error('Error al cargar lotes', {
        description: error.message,
      })
    } else if (data) {
      setLotes(data)
    }
  }

  const handleOpenLotesDialog = async (evento: Evento) => {
    setSelectedEvento(evento)
    await loadLotes(evento.id)
    setLotesDialogOpen(true)
  }

  const handleCloseLotesDialog = () => {
    setLotesDialogOpen(false)
    setSelectedEvento(null)
    setLotes([])
  }

  const handleOpenLoteForm = (lote?: Lote) => {
    if (lote) {
      setSelectedLote(lote)
      setLoteFormData({
        nombre: lote.nombre,
        cantidad_maxima: lote.cantidad_maxima.toString(),
        precio: lote.precio.toString(),
        es_vip: lote.es_vip,
      })
    } else {
      setSelectedLote(null)
      setLoteFormData({
        nombre: '',
        cantidad_maxima: '',
        precio: '',
        es_vip: false,
      })
    }
    setLoteFormDialogOpen(true)
  }

  const handleCloseLoteForm = () => {
    setLoteFormDialogOpen(false)
    setSelectedLote(null)
    setLoteFormData({
      nombre: '',
      cantidad_maxima: '',
      precio: '',
      es_vip: false,
    })
  }

  const handleSubmitLote = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedEvento) return

    const cantidadMaxima = parseInt(loteFormData.cantidad_maxima)
    const precio = parseFloat(loteFormData.precio)

    if (isNaN(cantidadMaxima) || cantidadMaxima <= 0) {
      toast.error('Cantidad máxima inválida')
      return
    }

    if (isNaN(precio) || precio < 0) {
      toast.error('Precio inválido')
      return
    }

    try {
      if (selectedLote) {
        // Actualizar lote existente
        const updates: UpdateLoteDTO = {
          nombre: loteFormData.nombre.trim(),
          cantidad_maxima: cantidadMaxima,
          precio: precio,
          es_vip: loteFormData.es_vip,
        }
        const { error } = await lotesService.updateLote(selectedLote.id, updates)
        if (error) throw error
        toast.success('Lote actualizado correctamente')
      } else {
        // Crear nuevo lote
        const newLote: CreateLoteDTO = {
          nombre: loteFormData.nombre.trim(),
          cantidad_maxima: cantidadMaxima,
          precio: precio,
          es_vip: loteFormData.es_vip,
          uuid_evento: selectedEvento.id,
        }
        const { error } = await lotesService.createLote(newLote)
        if (error) throw error
        toast.success('Lote creado correctamente')
      }

      handleCloseLoteForm()
      await loadLotes(selectedEvento.id)
    } catch (error) {
      toast.error('Error al guardar lote', {
        description: (error as Error).message,
      })
    }
  }

  const handleDeleteLote = async () => {
    if (!selectedLote || !selectedEvento) return

    try {
      const { error } = await lotesService.deleteLote(selectedLote.id)
      if (error) throw error

      toast.success('Lote eliminado correctamente')
      setDeleteLoteDialogOpen(false)
      setSelectedLote(null)
      await loadLotes(selectedEvento.id)
    } catch (error) {
      toast.error('Error al eliminar lote', {
        description: (error as Error).message,
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Eventos</h1>
          <p className="text-muted-foreground">
            Gestiona los eventos de tu club
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Evento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Eventos</CardTitle>
          <CardDescription>
            Todos los eventos de tu club
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando eventos...
            </div>
          ) : eventos.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <p className="mt-4 text-muted-foreground">
                No hay eventos registrados
              </p>
              <Button
                onClick={() => handleOpenDialog()}
                variant="outline"
                className="mt-4"
              >
                Crear primer evento
              </Button>
            </div>
          ) : (
            <>
              {/* Vista de escritorio: Tabla */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Banner</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Invitados</TableHead>
                      <TableHead>Ingresados</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventos.map((evento) => (
                      <TableRow key={evento.id}>
                        <TableCell>
                          <div className="w-20 h-12 rounded overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            {evento.banner_url ? (
                              <img
                                src={evento.banner_url}
                                alt={evento.nombre}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="h-6 w-6 text-muted-foreground opacity-30" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {evento.nombre}
                        </TableCell>
                        <TableCell>{formatFecha(evento.fecha)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {evento.total_invitados}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-green-600" />
                            {evento.total_ingresados}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={evento.estado ? 'default' : 'secondary'}
                            className={
                              evento.estado
                                ? 'bg-green-500'
                                : 'bg-gray-500'
                            }
                          >
                            {evento.estado ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenLotesDialog(evento)}
                              title="Gestionar lotes"
                            >
                              <Ticket className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleEstado(evento)}
                              title={
                                evento.estado
                                  ? 'Desactivar evento'
                                  : 'Activar evento'
                              }
                            >
                              {evento.estado ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(evento)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedEvento(evento)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Vista móvil: Cards */}
              <div className="md:hidden space-y-4">
                {eventos.map((evento) => (
                  <Card key={evento.id}>
                    <CardContent className="p-4">
                      {/* Banner */}
                      {evento.banner_url && (
                        <div className="w-full aspect-[2/1] rounded-lg overflow-hidden mb-4 bg-slate-100 dark:bg-slate-800">
                          <img
                            src={evento.banner_url}
                            alt={evento.nombre}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Info */}
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-lg">{evento.nombre}</h3>
                          <Badge
                            variant={evento.estado ? 'default' : 'secondary'}
                            className={
                              evento.estado
                                ? 'bg-green-500'
                                : 'bg-gray-500'
                            }
                          >
                            {evento.estado ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Calendar className="h-4 w-4" />
                            {formatFecha(evento.fecha, 'card')}
                          </div>
                          <div className="text-xs text-muted-foreground ml-6">
                            {formatHora(evento.fecha)} hs
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{evento.total_invitados} invitados</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-green-600" />
                            <span>{evento.total_ingresados} ingresados</span>
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenLotesDialog(evento)}
                            className="flex-1"
                          >
                            <Ticket className="h-4 w-4 mr-2" />
                            Lotes
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleEstado(evento)}
                            className="flex-1"
                          >
                            {evento.estado ? (
                              <>
                                <EyeOff className="h-4 w-4 mr-2" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                Activar
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(evento)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedEvento(evento)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
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

      {/* Dialog Crear/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedEvento ? 'Editar Evento' : 'Nuevo Evento'}
            </DialogTitle>
            <DialogDescription>
              {selectedEvento
                ? 'Modifica los datos del evento'
                : 'Completa los datos para crear un nuevo evento'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del evento</Label>
                <Input
                  id="nombre"
                  name="evento-nombre"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  placeholder="Ej: Fiesta de Año Nuevo"
                  autoComplete="off"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha y hora</Label>
                <Input
                  id="fecha"
                  type="datetime-local"
                  value={formData.fecha}
                  onChange={(e) =>
                    setFormData({ ...formData, fecha: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="banner">Banner del evento (opcional)</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      id="banner"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleFileSelect}
                      ref={fileInputRef}
                      className="cursor-pointer"
                    />
                    {previewUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveImage}
                        className="flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tamaño recomendado: 1200x600px • Formatos: JPG, PNG, WebP • Máximo: 5MB
                  </p>

                  {previewUrl && (
                    <div className="relative w-full aspect-[2/1] rounded-lg overflow-hidden border bg-slate-50 dark:bg-slate-900">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={uploading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>{selectedEvento ? 'Guardar cambios' : 'Crear evento'}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Eliminar Evento */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el evento "
              {selectedEvento?.nombre}" y todos sus invitados asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedEvento(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Gestión de Lotes */}
      <Dialog open={lotesDialogOpen} onOpenChange={setLotesDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestión de Lotes - {selectedEvento?.nombre}</DialogTitle>
            <DialogDescription>
              Administra los lotes de invitados para este evento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Button
              onClick={() => handleOpenLoteForm()}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Nuevo Lote
            </Button>

            {lotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Tag className="mx-auto h-12 w-12 opacity-50" />
                <p className="mt-4">No hay lotes creados para este evento</p>
                <p className="text-sm mt-2">Crea el primer lote para comenzar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lotes.map((lote) => {
                  const porcentajeUsado = (lote.cantidad_actual / lote.cantidad_maxima) * 100
                  const disponibles = lote.cantidad_maxima - lote.cantidad_actual

                  return (
                    <Card key={lote.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-lg">{lote.nombre}</h4>
                              {lote.es_vip && (
                                <Badge className="bg-yellow-500 gap-1">
                                  <Crown className="h-3 w-3" />
                                  VIP
                                </Badge>
                              )}
                              {!lote.activo && (
                                <Badge variant="secondary">Inactivo</Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {lote.precio === 0 ? (
                                    <span className="text-green-600 font-medium">GRATIS</span>
                                  ) : (
                                    <span className="font-medium">${lote.precio.toFixed(2)}</span>
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  <span className="font-medium">{disponibles}</span> / {lote.cantidad_maxima} disponibles
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{lote.cantidad_actual} usados</span>
                                <span>{porcentajeUsado.toFixed(0)}%</span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    porcentajeUsado >= 90
                                      ? 'bg-red-500'
                                      : porcentajeUsado >= 70
                                      ? 'bg-yellow-500'
                                      : 'bg-green-500'
                                  }`}
                                  style={{ width: `${porcentajeUsado}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenLoteForm(lote)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedLote(lote)
                                setDeleteLoteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseLotesDialog}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Formulario de Lote */}
      <Dialog open={loteFormDialogOpen} onOpenChange={setLoteFormDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedLote ? 'Editar Lote' : 'Nuevo Lote'}
            </DialogTitle>
            <DialogDescription>
              {selectedLote
                ? 'Modifica los datos del lote'
                : 'Completa los datos para crear un nuevo lote'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitLote}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="lote-nombre">Nombre del lote</Label>
                <Input
                  id="lote-nombre"
                  value={loteFormData.nombre}
                  onChange={(e) =>
                    setLoteFormData({ ...loteFormData, nombre: e.target.value })
                  }
                  placeholder="Ej: Early Bird, VIP Gold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lote-cantidad">Cantidad máxima</Label>
                  <Input
                    id="lote-cantidad"
                    type="number"
                    min="1"
                    value={loteFormData.cantidad_maxima}
                    onChange={(e) =>
                      setLoteFormData({ ...loteFormData, cantidad_maxima: e.target.value })
                    }
                    placeholder="100"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lote-precio">Precio</Label>
                  <Input
                    id="lote-precio"
                    type="number"
                    min="0"
                    step="0.01"
                    value={loteFormData.precio}
                    onChange={(e) =>
                      setLoteFormData({ ...loteFormData, precio: e.target.value })
                    }
                    placeholder="0.00"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Usa 0 para lotes gratuitos
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lote-vip"
                  checked={loteFormData.es_vip}
                  onCheckedChange={(checked) =>
                    setLoteFormData({ ...loteFormData, es_vip: checked as boolean })
                  }
                />
                <label
                  htmlFor="lote-vip"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                >
                  <Crown className="h-4 w-4 text-yellow-500" />
                  Es VIP (permite múltiples escaneos)
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseLoteForm}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {selectedLote ? 'Guardar cambios' : 'Crear lote'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Eliminar Lote */}
      <AlertDialog open={deleteLoteDialogOpen} onOpenChange={setDeleteLoteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar lote?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el lote "{selectedLote?.nombre}". Los invitados asociados
              a este lote quedarán sin lote asignado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedLote(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLote}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
