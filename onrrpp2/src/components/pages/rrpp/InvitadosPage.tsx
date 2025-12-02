import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '@/services/auth.service'
import { eventosService } from '@/services/eventos.service'
import { invitadosService, type InvitadoConLote } from '@/services/invitados.service'
import { lotesService } from '@/services/lotes.service'
import { ventasService } from '@/services/ventas.service'
import { ubicacionesService } from '@/services/ubicaciones.service'
import { supabase } from '@/lib/supabase'
import type { Evento, Lote, MetodoPago } from '@/types/database'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogPortal,
} from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { toast } from 'sonner'
import {
  Plus,
  QrCode,
  Edit,
  Trash2,
  MapPin,
  UserCheck,
  X,
  Crown,
  Ticket,
  Calendar,
  DollarSign,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

export function InvitadosPage() {
  const { user } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()

  const [eventos, setEventos] = useState<Evento[]>([])
  const [selectedEvento, setSelectedEvento] = useState<string>('')
  const [invitados, setInvitados] = useState<InvitadoConLote[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedInvitado, setSelectedInvitado] = useState<InvitadoConLote | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    edad: '',
    departamento: '',
    localidad: '',
    sexo: 'hombre' as 'hombre' | 'mujer',
    uuid_lote: '',
    metodo_pago: '' as MetodoPago | '',
    monto_efectivo: '',
    monto_transferencia: '',
    observaciones: '',
    profile_image_url: '',
  })
  const [pendingLoteId, setPendingLoteId] = useState<string | null>(null)
  const [selectedLotePrecio, setSelectedLotePrecio] = useState<number>(0)
  const [selectedLoteEsVip, setSelectedLoteEsVip] = useState<boolean>(false)
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string>('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [ventaInfo, setVentaInfo] = useState<{
    metodo_pago: string
    monto_total: number
    observaciones: string | null
  } | null>(null)

  // Filtros
  const [searchNombre, setSearchNombre] = useState('')
  const [filterLote, setFilterLote] = useState<string>('ALL')

  // Autocomplete de ubicaciones
  const [departamentos, setDepartamentos] = useState<string[]>([])
  const [localidades, setLocalidades] = useState<string[]>([])
  const [filteredDepartamentos, setFilteredDepartamentos] = useState<string[]>([])
  const [filteredLocalidades, setFilteredLocalidades] = useState<string[]>([])
  const [showDepartamentoDropdown, setShowDepartamentoDropdown] = useState(false)
  const [showLocalidadDropdown, setShowLocalidadDropdown] = useState(false)

  useEffect(() => {
    if (user) {
      loadEventos()
    }
    loadDepartamentos()
  }, [user])

  const loadDepartamentos = async () => {
    const { data, error } = await ubicacionesService.getDepartamentos()
    if (!error && data) {
      setDepartamentos(data)
      setFilteredDepartamentos(data)
    }
  }

  const handleDepartamentoChange = async (value: string) => {
    setFormData({ ...formData, departamento: value, localidad: '' })

    // Filtrar departamentos
    const filtered = departamentos.filter(d =>
      d.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredDepartamentos(filtered)
    setShowDepartamentoDropdown(value.length > 0 && filtered.length > 0)

    // Cargar localidades del departamento
    if (value.length > 2) {
      const { data, error } = await ubicacionesService.searchLocalidades('', value)
      if (!error && data) {
        setLocalidades(data)
        setFilteredLocalidades(data)
      }
    }
  }

  const handleLocalidadChange = (value: string) => {
    setFormData({ ...formData, localidad: value })

    // Filtrar localidades
    const filtered = localidades.filter(l =>
      l.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredLocalidades(filtered)
    setShowLocalidadDropdown(value.length > 0 && filtered.length > 0)
  }

  const selectDepartamento = async (departamento: string) => {
    setFormData({ ...formData, departamento, localidad: '' })
    setShowDepartamentoDropdown(false)

    // Cargar localidades del departamento seleccionado
    const { data, error } = await ubicacionesService.getLocalidadesByDepartamento(departamento)
    if (!error && data) {
      setLocalidades(data)
      setFilteredLocalidades(data)
    }
  }

  const selectLocalidad = (localidad: string) => {
    setFormData({ ...formData, localidad })
    setShowLocalidadDropdown(false)
  }

  // Manejar parámetros de URL (eventoId y loteId preseleccionados)
  useEffect(() => {
    const eventoId = searchParams.get('eventoId')
    const loteId = searchParams.get('loteId')

    if (eventoId) {
      setSelectedEvento(eventoId)
      if (loteId) {
        setPendingLoteId(loteId)
      }
      // Limpiar los parámetros de la URL
      setSearchParams({})
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (selectedEvento) {
      loadInvitados()
      loadLotes()
    }
  }, [selectedEvento])

  // Realtime para actualizar cuando seguridad escanea QR
  useEffect(() => {
    if (!user || !selectedEvento) return

    const invitadosChannel = supabase
      .channel(`invitados-updates-${selectedEvento}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'invitados',
          filter: `uuid_evento=eq.${selectedEvento}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('📡 Realtime UPDATE en invitado:', payload)
          const invitadoActualizado = payload.new

          // Actualizar el invitado en la lista local
          setInvitados((prevInvitados) =>
            prevInvitados.map((inv) =>
              inv.id === invitadoActualizado.id
                ? { ...inv, ingresado: invitadoActualizado.ingresado, fecha_ingreso: invitadoActualizado.fecha_ingreso }
                : inv
            )
          )

          // Mostrar notificación si el invitado es mío y acaba de ingresar
          if (invitadoActualizado.id_rrpp === user.id && invitadoActualizado.ingresado) {
            toast.success('Invitado ingresó al evento', {
              description: `${invitadoActualizado.nombre} ${invitadoActualizado.apellido} acaba de ingresar`,
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción invitados UPDATE:', status)
      })

    return () => {
      console.log('🔌 Desuscribiendo de invitados-updates')
      invitadosChannel.unsubscribe()
    }
  }, [user, selectedEvento])

  // Realtime para actualizar lotes cuando admin los activa/desactiva
  useEffect(() => {
    if (!selectedEvento) return

    const lotesChannel = supabase
      .channel(`lotes-updates-${selectedEvento}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lotes',
          filter: `uuid_evento=eq.${selectedEvento}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('📡 Realtime UPDATE en lote:', payload)
          loadLotes() // Recargar lotes cuando hay cambios
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción lotes UPDATE:', status)
      })

    return () => {
      console.log('🔌 Desuscribiendo de lotes-updates')
      lotesChannel.unsubscribe()
    }
  }, [selectedEvento])

  // Realtime para actualizar totales en las cards de eventos
  useEffect(() => {
    if (!user) return

    // Suscribirse a cambios en la tabla invitados para actualizar contadores
    const totalsChannel = supabase
      .channel('invitados-totals-rrpp')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'invitados',
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('📡 Realtime cambio en invitados para totales:', payload.eventType)

          // Solo actualizar si el cambio afecta a mis invitados
          const invitadoAfectado = payload.new || payload.old
          if (invitadoAfectado && invitadoAfectado.id_rrpp === user.id) {
            const eventoId = invitadoAfectado.uuid_evento

            // Recargar estadísticas del RRPP para este evento específico
            const { data: statsRRPP, error } = await eventosService.getEventosRRPPStats(user.id)

            if (!error && statsRRPP) {
              // Actualizar solo el evento afectado
              setEventos((prevEventos) =>
                prevEventos.map((evento) => {
                  if (evento.id === eventoId) {
                    const stat = statsRRPP.find(s => s.evento_id === eventoId)
                    return {
                      ...evento,
                      total_invitados: stat?.mis_invitados || 0,
                      total_ingresados: stat?.mis_ingresados || 0,
                    }
                  }
                  return evento
                })
              )
              console.log('📡 Contadores actualizados para evento:', eventoId)
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción totales RRPP:', status)
      })

    return () => {
      console.log('🔌 Desuscribiendo de totales RRPP')
      totalsChannel.unsubscribe()
    }
  }, [user])

  // Abrir dialog después de que se carguen los lotes
  useEffect(() => {
    if (pendingLoteId && lotes.length > 0) {
      handleOpenDialog(undefined, pendingLoteId)
      setPendingLoteId(null)
    }
  }, [lotes, pendingLoteId])

  const loadEventos = async () => {
    if (!user) return

    // Obtener todos los eventos activos del club
    const { data: todosEventos, error: errorEventos } = await eventosService.getEventos()

    if (errorEventos) {
      toast.error('Error al cargar eventos', {
        description: errorEventos.message,
      })
      setLoading(false)
      return
    }

    // Obtener las estadísticas del RRPP
    const { data: statsRRPP, error: errorStats } = await eventosService.getEventosRRPPStats(user.id)

    if (!errorStats && todosEventos) {
      // Crear un mapa de stats por evento_id
      const statsMap = new Map(
        (statsRRPP || []).map(stat => [stat.evento_id, stat])
      )

      // Mapear todos los eventos con sus stats (o 0 si no tiene invitados)
      const eventosMapeados: Evento[] = todosEventos.map(evento => {
        const stat = statsMap.get(evento.id)
        return {
          ...evento,
          total_invitados: stat?.mis_invitados || 0,
          total_ingresados: stat?.mis_ingresados || 0,
        }
      })

      // Filtrar solo eventos activos
      const eventosActivos = eventosMapeados.filter(e => e.estado)
      setEventos(eventosActivos)
    }

    setLoading(false)
  }

  const loadLotes = async () => {
    if (!selectedEvento) return

    const { data, error } = await lotesService.getLotesDisponiblesByEvento(selectedEvento)
    if (error) {
      toast.error('Error al cargar lotes', {
        description: error.message,
      })
    } else if (data) {
      setLotes(data)
    }
  }

  const loadInvitados = async () => {
    if (!user) return

    setLoading(true)
    const { data, error } = await invitadosService.getMyInvitados(user.id, selectedEvento)
    if (error) {
      toast.error('Error al cargar invitados', {
        description: error.message,
      })
    } else if (data) {
      setInvitados(data)
    }
    setLoading(false)
  }

  const handleShowQR = async (invitado: InvitadoConLote) => {
    if (!user) return

    // Verificar si el usuario está activo antes de mostrar el QR
    const { isActive, error } = await authService.checkUserActive(user.id)

    if (error) {
      toast.error('Error al verificar estado del usuario', {
        description: error.message,
      })
      return
    }

    if (!isActive) {
      toast.error('Usuario inactivo', {
        description: 'Tu cuenta ha sido desactivada. Contacta con un administrador.',
      })

      // Cerrar sesión con razón (sin recargar)
      await useAuthStore.getState().signOut('Tu cuenta ha sido deshabilitada, contacta con un administrador')
      return
    }

    // Si el usuario está activo, mostrar el QR
    setSelectedInvitado(invitado)
    setQrDialogOpen(true)
  }

  const handleOpenDialog = async (invitado?: InvitadoConLote, preselectedLoteId?: string) => {
    // Recargar lotes disponibles para obtener la lista actualizada
    await loadLotes()

    if (invitado) {
      setSelectedInvitado(invitado)
      setFormData({
        nombre: invitado.nombre,
        apellido: invitado.apellido,
        edad: invitado.edad?.toString() || '',
        departamento: invitado.departamento || '',
        localidad: invitado.localidad || '',
        sexo: invitado.sexo,
        uuid_lote: invitado.uuid_lote || '',
        metodo_pago: '',
        monto_efectivo: '',
        monto_transferencia: '',
        observaciones: '',
        profile_image_url: invitado.profile_image_url || '',
      })
      if (invitado.lote) {
        setSelectedLotePrecio(invitado.lote.precio)
        setSelectedLoteEsVip(invitado.lote.es_vip)
      }
      if (invitado.profile_image_url) {
        setProfileImagePreview(invitado.profile_image_url)
      }
      // Cargar localidades del departamento si existe
      if (invitado.departamento) {
        const { data } = await ubicacionesService.getLocalidadesByDepartamento(invitado.departamento)
        if (data) {
          setLocalidades(data)
          setFilteredLocalidades(data)
        }
      }

      // Cargar información de venta si existe
      try {
        const venta = await ventasService.getVentaByInvitado(invitado.id)
        if (venta) {
          setVentaInfo({
            metodo_pago: venta.metodo_pago,
            monto_total: Number(venta.monto_total),
            observaciones: venta.observaciones,
          })
          // Pre-cargar método de pago en el formulario
          setFormData(prev => ({
            ...prev,
            metodo_pago: venta.metodo_pago,
            observaciones: venta.observaciones || '',
          }))
        } else {
          setVentaInfo(null)
        }
      } catch (error) {
        setVentaInfo(null)
      }
    } else {
      setSelectedInvitado(null)
      setVentaInfo(null)
      setProfileImageFile(null)
      setProfileImagePreview('')
      setLocalidades([])
      setFilteredLocalidades([])
      setFormData({
        nombre: '',
        apellido: '',
        edad: '',
        departamento: '',
        localidad: '',
        sexo: 'hombre',
        uuid_lote: preselectedLoteId || '',
        metodo_pago: '',
        monto_efectivo: '',
        monto_transferencia: '',
        observaciones: '',
        profile_image_url: '',
      })
      // Si hay lote preseleccionado, buscar su precio y si es VIP
      if (preselectedLoteId) {
        const lote = lotes.find(l => l.id === preselectedLoteId)
        if (lote) {
          setSelectedLotePrecio(lote.precio)
          setSelectedLoteEsVip(lote.es_vip)
        }
      }
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedInvitado(null)
    setSelectedLotePrecio(0)
    setSelectedLoteEsVip(false)
    setVentaInfo(null)
    setProfileImageFile(null)
    setProfileImagePreview('')
    setLocalidades([])
    setFilteredLocalidades([])
    setShowDepartamentoDropdown(false)
    setShowLocalidadDropdown(false)
    setFormData({
      nombre: '',
      apellido: '',
      edad: '',
      departamento: '',
      localidad: '',
      sexo: 'hombre',
      uuid_lote: '',
      metodo_pago: '',
      monto_efectivo: '',
      monto_transferencia: '',
      observaciones: '',
      profile_image_url: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !selectedEvento) return

    // Validar que se haya seleccionado un lote (obligatorio)
    if (!formData.uuid_lote) {
      toast.error('Debe seleccionar un lote')
      return
    }

    const loteSeleccionado = lotes.find(l => l.id === formData.uuid_lote)

    // Validar que el lote existe
    if (!loteSeleccionado) {
      toast.error('El lote seleccionado no existe')
      return
    }

    // Validar imagen de perfil para lotes VIP
    if (loteSeleccionado && loteSeleccionado.es_vip) {
      if (!selectedInvitado && !profileImageFile) {
        toast.error('La imagen de perfil es obligatoria para invitados VIP')
        return
      }
      if (selectedInvitado && !formData.profile_image_url && !profileImageFile) {
        toast.error('La imagen de perfil es obligatoria para invitados VIP')
        return
      }
    }

    // Validar campos de pago solo cuando se está creando un nuevo invitado con un lote pago
    if (!selectedInvitado && loteSeleccionado && loteSeleccionado.precio > 0) {
      if (!formData.metodo_pago) {
        toast.error('Debe seleccionar un método de pago')
        return
      }

      const montoEfectivo = parseFloat(formData.monto_efectivo) || 0
      const montoTransferencia = parseFloat(formData.monto_transferencia) || 0
      const total = montoEfectivo + montoTransferencia

      if (formData.metodo_pago === 'efectivo') {
        if (montoEfectivo !== loteSeleccionado.precio) {
          toast.error('El monto en efectivo debe ser igual al precio del lote')
          return
        }
      } else if (formData.metodo_pago === 'transferencia') {
        if (montoTransferencia !== loteSeleccionado.precio) {
          toast.error('El monto en transferencia debe ser igual al precio del lote')
          return
        }
      } else if (formData.metodo_pago === 'mixto') {
        if (montoEfectivo === 0 || montoTransferencia === 0) {
          toast.error('Debe ingresar montos tanto en efectivo como en transferencia')
          return
        }
        if (total !== loteSeleccionado.precio) {
          toast.error(`La suma de efectivo y transferencia debe ser igual al precio del lote ($${loteSeleccionado.precio})`)
          return
        }
      }
    }

    // Subir imagen de perfil si hay una nueva
    let profileImageUrl = formData.profile_image_url
    if (profileImageFile) {
      setUploadingImage(true)
      const tempId = selectedInvitado?.id || `temp-${Date.now()}`
      const { url, error: uploadError } = await invitadosService.uploadProfileImage(
        profileImageFile,
        user.club.id,
        tempId
      )
      setUploadingImage(false)

      if (uploadError) {
        toast.error('Error al subir la imagen de perfil', {
          description: uploadError.message,
        })
        return
      }

      profileImageUrl = url || ''

      // Si estamos editando y había una imagen anterior, eliminarla
      if (selectedInvitado && selectedInvitado.profile_image_url && selectedInvitado.profile_image_url !== profileImageUrl) {
        await invitadosService.deleteProfileImage(selectedInvitado.profile_image_url, user.club.id)
      }
    }

    if (selectedInvitado) {
      // Actualizar - NO incluir dni, uuid_evento ni campos que no deben cambiar
      const updateData = {
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        edad: formData.edad ? parseInt(formData.edad) : null,
        departamento: formData.departamento.trim() || null,
        localidad: formData.localidad.trim() || null,
        sexo: formData.sexo,
        uuid_lote: formData.uuid_lote || null,
        profile_image_url: profileImageUrl || null,
      }

      const { error } = await invitadosService.updateInvitado(
        selectedInvitado.id,
        updateData
      )
      if (error) {
        // Log completo del error para debugging
        console.error('Error completo al actualizar:', error)
        console.error('updateData enviado:', updateData)

        // Mostrar mensaje de error específico si el lote está lleno
        const errorMsg = error.message.toLowerCase()
        if (errorMsg.includes('completo') || errorMsg.includes('full')) {
          toast.error('Lote completo', {
            description: error.message,
          })
        } else {
          toast.error('Error al actualizar invitado', {
            description: error.message,
          })
        }
        // Recargar lotes para actualizar disponibilidad
        loadLotes()
      } else {
        toast.success('Invitado actualizado correctamente')
        handleCloseDialog()
        loadInvitados()
        // Recargar lotes si el lote cambió
        if (selectedInvitado.uuid_lote !== updateData.uuid_lote) {
          loadLotes()
        }
      }
    } else {
      // Crear - incluir dni y uuid_evento
      const createData = {
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        edad: formData.edad ? parseInt(formData.edad) : null,
        departamento: formData.departamento.trim() || null,
        localidad: formData.localidad.trim() || null,
        dni: `${formData.nombre.trim()}-${formData.apellido.trim()}-${Date.now()}`,
        sexo: formData.sexo,
        uuid_evento: selectedEvento,
        uuid_lote: formData.uuid_lote, // Obligatorio, ya validado arriba
        profile_image_url: profileImageUrl || null,
      }

      const { data, error } = await invitadosService.createInvitado(createData, user.id)
      if (error) {
        // Mostrar mensaje de error específico si el lote está lleno
        const errorMsg = error.message.toLowerCase()
        if (errorMsg.includes('completo') || errorMsg.includes('full')) {
          toast.error('Lote completo', {
            description: error.message,
          })
        } else {
          toast.error('Error al crear invitado', {
            description: error.message,
          })
        }
        // Recargar lotes para actualizar disponibilidad
        loadLotes()
        return
      } else {
        // Verificar que data no sea null
        if (!data) {
          toast.error('Error al crear invitado')
          return
        }
        
        // Si el lote tiene precio, crear venta
        if (loteSeleccionado && loteSeleccionado.precio > 0) {
          try {
            await ventasService.createVenta({
              uuid_invitado: data.id,
              uuid_evento: selectedEvento,
              uuid_lote: formData.uuid_lote,
              id_rrpp: user.id,
              metodo_pago: formData.metodo_pago as MetodoPago,
              monto_total: loteSeleccionado.precio,
              monto_efectivo: parseFloat(formData.monto_efectivo) || 0,
              monto_transferencia: parseFloat(formData.monto_transferencia) || 0,
              observaciones: formData.observaciones || undefined,
            })
            toast.success('Invitado creado y venta registrada correctamente')
          } catch (ventaError) {
            toast.warning('Invitado creado pero hubo un error al registrar la venta', {
              description: ventaError instanceof Error ? ventaError.message : 'Error desconocido',
            })
          }
        } else {
          toast.success('Invitado creado correctamente')
        }

        handleCloseDialog()
        await loadInvitados()
        // Recargar lotes para actualizar disponibilidad
        await loadLotes()
        // Mostrar QR automáticamente buscando el invitado con detalles completos
        if (data && invitados.length > 0) {
          const invitadoCreado = invitados.find(i => i.id === data.id)
          if (invitadoCreado) {
            await handleShowQR(invitadoCreado)
          }
        }
      }
    }
  }

  const handleOpenDeleteDialog = (invitado: InvitadoConLote) => {
    // Verificar si el invitado ya ingresó
    if (invitado.ingresado) {
      toast.error('No se puede eliminar', {
        description: 'Este invitado ya ingresó al evento y no puede ser eliminado',
      })
      return
    }

    setSelectedInvitado(invitado)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedInvitado) return

    // Doble verificación por seguridad
    if (selectedInvitado.ingresado) {
      toast.error('No se puede eliminar', {
        description: 'Este invitado ya ingresó al evento',
      })
      setDeleteDialogOpen(false)
      setSelectedInvitado(null)
      return
    }

    const { error } = await invitadosService.deleteInvitado(selectedInvitado.id)
    if (error) {
      toast.error('Error al eliminar invitado', {
        description: error.message,
      })
    } else {
      toast.success('Invitado eliminado correctamente')
      setDeleteDialogOpen(false)
      setSelectedInvitado(null)
      loadInvitados()
      // Recargar lotes para actualizar disponibilidad
      loadLotes()
    }
  }

  const handleEventoClick = (eventoId: string) => {
    if (selectedEvento === eventoId) {
      // Si el mismo evento está seleccionado, deseleccionarlo (colapsar)
      setSelectedEvento('')
      setInvitados([])
      setLotes([])
    } else {
      // Seleccionar nuevo evento
      setSelectedEvento(eventoId)
      // Resetear filtros
      setSearchNombre('')
      setFilterLote('ALL')
    }
  }

  // Filtrar invitados
  const filteredInvitados = useMemo(() => {
    return invitados.filter((invitado) => {
      // Filtro por nombre
      const nombreCompleto = `${invitado.nombre} ${invitado.apellido}`.toLowerCase()
      const matchNombre = nombreCompleto.includes(searchNombre.toLowerCase())

      // Filtro por lote
      const matchLote = filterLote === 'ALL' || invitado.uuid_lote === filterLote

      return matchNombre && matchLote
    })
  }, [invitados, searchNombre, filterLote])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Invitados</h1>
          <p className="text-muted-foreground">
            Selecciona un evento para gestionar tus invitados
          </p>
        </div>
      </div>

      {/* Grid de eventos con banners */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando eventos...</p>
        </div>
      ) : eventos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No hay eventos activos disponibles. Contacta con un administrador.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {eventos.map((evento) => {
            const isExpanded = selectedEvento === evento.id

            return (
              <div key={evento.id} className={isExpanded ? "md:col-span-2 lg:col-span-3" : ""}>
                <Card
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    isExpanded ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleEventoClick(evento.id)}
                >
                  <div className="relative aspect-video w-full overflow-hidden rounded-t-lg">
                    {evento.banner_url ? (
                      <img
                        src={evento.banner_url}
                        alt={evento.nombre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                        <Calendar className="h-16 w-16 text-white opacity-50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-2xl font-bold text-white mb-1">{evento.nombre}</h3>
                      {evento.fecha && (
                        <p className="text-sm text-white/90">
                          {new Date(evento.fecha).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">
                            {evento.total_ingresados || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Ingresados</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{evento.total_invitados || 0}</div>
                          <div className="text-xs text-muted-foreground">Total</div>
                        </div>
                      </div>
                      <Button
                        variant={isExpanded ? "default" : "ghost"}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEventoClick(evento.id)
                        }}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-2" />
                            Ocultar
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-2" />
                            Ver invitados
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Sección de invitados expandida */}
                {isExpanded && (
                  <Card className="mt-4">
                    <CardHeader>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <CardTitle>Lista de Invitados</CardTitle>
                          <CardDescription>
                            {filteredInvitados.length} de {invitados.length} invitados
                          </CardDescription>
                        </div>
                        <Button onClick={() => handleOpenDialog()} className="gap-2">
                          <Plus className="h-4 w-4" />
                          Nuevo Invitado
                        </Button>
                      </div>

                      {/* Filtros */}
                      <div className="flex flex-col md:flex-row gap-4 mt-4">
                        <div className="flex-1">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar por nombre..."
                              value={searchNombre}
                              onChange={(e) => setSearchNombre(e.target.value)}
                              className="pl-9"
                            />
                          </div>
                        </div>
                        <div className="w-full md:w-64">
                          <Select value={filterLote} onValueChange={setFilterLote}>
                            <SelectTrigger>
                              <Filter className="h-4 w-4 mr-2" />
                              <SelectValue placeholder="Filtrar por lote" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">Todos los lotes</SelectItem>
                              {lotes.map((lote) => (
                                <SelectItem key={lote.id} value={lote.id}>
                                  {lote.es_vip && '👑 '}
                                  {lote.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      {loading ? (
                        <div className="text-center py-8 text-muted-foreground">
                          Cargando invitados...
                        </div>
                      ) : filteredInvitados.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">
                            {invitados.length === 0
                              ? 'No hay invitados registrados'
                              : 'No se encontraron invitados con los filtros aplicados'}
                          </p>
                          {invitados.length === 0 && (
                            <Button
                              onClick={() => handleOpenDialog()}
                              variant="outline"
                              className="mt-4"
                            >
                              Agregar primer invitado
                            </Button>
                          )}
                        </div>
                      ) : (
                        <>
                          {/* Vista desktop */}
                          <div className="hidden md:block">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nombre</TableHead>
                                  <TableHead>Lote</TableHead>
                                  <TableHead>Ubicación</TableHead>
                                  <TableHead>Estado</TableHead>
                                  <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredInvitados.map((invitado) => (
                                  <TableRow key={invitado.id}>
                                    <TableCell className="font-medium">
                                      {invitado.nombre} {invitado.apellido}
                                    </TableCell>
                                    <TableCell>
                                      {invitado.lote ? (
                                        <div className="flex items-center gap-2">
                                          {invitado.lote.es_vip && (
                                            <Crown className="h-3 w-3 text-yellow-500" />
                                          )}
                                          <span className="text-sm">{invitado.lote.nombre}</span>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground text-sm">Sin lote</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {(invitado.departamento || invitado.localidad) && (
                                        <div className="flex items-center gap-1">
                                          <MapPin className="h-3 w-3" />
                                          <span className="text-sm">
                                            {invitado.localidad && invitado.departamento
                                              ? `${invitado.localidad}, ${invitado.departamento}`
                                              : invitado.localidad || invitado.departamento}
                                          </span>
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant={invitado.ingresado ? 'default' : 'secondary'}
                                        className={
                                          invitado.ingresado
                                            ? 'bg-green-500'
                                            : 'bg-gray-500'
                                        }
                                      >
                                        {invitado.ingresado ? (
                                          <>
                                            <UserCheck className="h-3 w-3 mr-1" />
                                            Ingresado
                                          </>
                                        ) : (
                                          'Pendiente'
                                        )}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleShowQR(invitado)}
                                        >
                                          <QrCode className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleOpenDialog(invitado)}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleOpenDeleteDialog(invitado)}
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

                          {/* Vista móvil */}
                          <div className="md:hidden space-y-4">
                            {filteredInvitados.map((invitado) => (
                              <Card key={invitado.id}>
                                <CardContent className="p-4">
                                  <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <h3 className="font-semibold">
                                          {invitado.nombre} {invitado.apellido}
                                        </h3>
                                        {(invitado.departamento || invitado.localidad) && (
                                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                            <MapPin className="h-3 w-3" />
                                            {invitado.localidad && invitado.departamento
                                              ? `${invitado.localidad}, ${invitado.departamento}`
                                              : invitado.localidad || invitado.departamento}
                                          </div>
                                        )}
                                        {invitado.lote && (
                                          <div className="flex items-center gap-2 mt-1">
                                            {invitado.lote.es_vip && (
                                              <Crown className="h-3 w-3 text-yellow-500" />
                                            )}
                                            <span className="text-sm">{invitado.lote.nombre}</span>
                                          </div>
                                        )}
                                      </div>
                                      <Badge
                                        variant={invitado.ingresado ? 'default' : 'secondary'}
                                        className={
                                          invitado.ingresado
                                            ? 'bg-green-500'
                                            : 'bg-gray-500'
                                        }
                                      >
                                        {invitado.ingresado ? 'Ingresado' : 'Pendiente'}
                                      </Badge>
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleShowQR(invitado)}
                                        className="flex-1"
                                      >
                                        <QrCode className="h-4 w-4 mr-2" />
                                        Ver QR
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleOpenDialog(invitado)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleOpenDeleteDialog(invitado)}
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
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Dialog Crear/Editar Invitado */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-full md:max-w-2xl h-screen md:h-auto m-0 md:m-4 rounded-none md:rounded-lg p-0"
          onInteractOutside={(e) => {
            // Prevenir cierre al hacer clic en Select u otros elementos portalizados
            e.preventDefault()
          }}
        >
          <DialogHeader className="px-4 pt-4 pb-2 border-b bg-white dark:bg-slate-950">
            <DialogTitle>
              {selectedInvitado ? 'Editar Invitado' : 'Nuevo Invitado'}
            </DialogTitle>
            <DialogDescription>
              {selectedInvitado
                ? 'Modifica los datos del invitado'
                : 'Completa los datos del invitado'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="relative h-[calc(100vh-80px)] md:h-auto">
            <div className="space-y-4 py-4 px-4 overflow-y-auto h-full pb-24 md:pb-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    name="invitado-nombre"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    autoComplete="off"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido</Label>
                  <Input
                    id="apellido"
                    name="invitado-apellido"
                    value={formData.apellido}
                    onChange={(e) =>
                      setFormData({ ...formData, apellido: e.target.value })
                    }
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edad">Edad</Label>
                  <Input
                    id="edad"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.edad}
                    onChange={(e) =>
                      setFormData({ ...formData, edad: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sexo">Sexo</Label>
                  <Select
                    value={formData.sexo}
                    onValueChange={(value: 'hombre' | 'mujer') =>
                      setFormData({ ...formData, sexo: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hombre">Hombre</SelectItem>
                      <SelectItem value="mujer">Mujer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 relative">
                  <Label htmlFor="departamento">Departamento (Municipio)</Label>
                  <Input
                    id="departamento"
                    name="invitado-departamento"
                    value={formData.departamento}
                    onChange={(e) => handleDepartamentoChange(e.target.value)}
                    onFocus={() => setShowDepartamentoDropdown(filteredDepartamentos.length > 0)}
                    onBlur={() => setTimeout(() => setShowDepartamentoDropdown(false), 200)}
                    placeholder="Ej: Capital"
                    autoComplete="off"
                    required
                  />
                  {showDepartamentoDropdown && filteredDepartamentos.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredDepartamentos.map((dept) => (
                        <div
                          key={dept}
                          className="px-4 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100"
                          onMouseDown={() => selectDepartamento(dept)}
                        >
                          {dept}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2 relative">
                  <Label htmlFor="localidad">Localidad</Label>
                  <Input
                    id="localidad"
                    name="invitado-localidad"
                    value={formData.localidad}
                    onChange={(e) => handleLocalidadChange(e.target.value)}
                    onFocus={() => setShowLocalidadDropdown(filteredLocalidades.length > 0)}
                    onBlur={() => setTimeout(() => setShowLocalidadDropdown(false), 200)}
                    placeholder="Ej: Posadas"
                    autoComplete="off"
                    required
                    disabled={!formData.departamento}
                  />
                  {showLocalidadDropdown && filteredLocalidades.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredLocalidades.map((loc) => (
                        <div
                          key={loc}
                          className="px-4 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100"
                          onMouseDown={() => selectLocalidad(loc)}
                        >
                          {loc}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lote">Lote *</Label>
                <Select
                  value={formData.uuid_lote}
                  onValueChange={(value) => {
                    const lote = lotes.find(l => l.id === value)
                    const nuevoPrecio = lote?.precio || 0
                    const esVip = lote?.es_vip || false

                    setFormData({
                      ...formData,
                      uuid_lote: value,
                      // Resetear campos de pago al cambiar de lote
                      metodo_pago: '',
                      monto_efectivo: '',
                      monto_transferencia: '',
                    })
                    setSelectedLotePrecio(nuevoPrecio)
                    setSelectedLoteEsVip(esVip)

                    // Si estamos editando, actualizar/crear ventaInfo
                    if (selectedInvitado) {
                      if (nuevoPrecio === 0) {
                        // Lote gratis: limpiar ventaInfo
                        setVentaInfo(null)
                      } else {
                        // Lote con precio: actualizar o crear ventaInfo
                        if (ventaInfo) {
                          // Ya existe, actualizar monto
                          setVentaInfo({
                            ...ventaInfo,
                            monto_total: nuevoPrecio
                          })
                        } else {
                          // No existe (era gratis), crear nuevo
                          setVentaInfo({
                            metodo_pago: '',
                            monto_total: nuevoPrecio,
                            observaciones: null
                          })
                        }
                      }
                    }
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar lote" />
                  </SelectTrigger>
                  <SelectContent>
                    {lotes.map((lote) => {
                      const disponibles = lote.cantidad_maxima - lote.cantidad_actual
                      const estaLleno = disponibles <= 0
                      return (
                        <SelectItem
                          key={lote.id}
                          value={lote.id}
                          disabled={estaLleno}
                        >
                          <div className="flex items-center gap-2">
                            <span>{lote.nombre}</span>
                            {lote.es_vip && <span>👑</span>}
                            <span className="text-xs text-muted-foreground">
                              {lote.precio === 0 ? 'GRATIS' : `$${lote.precio.toFixed(2)}`}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({disponibles} disponibles)
                            </span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {lotes.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No hay lotes disponibles para este evento
                  </p>
                )}
              </div>

              {/* Campo de imagen de perfil - Obligatorio para lotes VIP */}
              {selectedLoteEsVip && (
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="profile_image">Imagen de Perfil VIP *</Label>
                    <Badge variant="default" className="bg-yellow-500">
                      <Crown className="h-3 w-3 mr-1" />
                      VIP
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {profileImagePreview && (
                      <div className="relative w-32 h-32 mx-auto">
                        <img
                          src={profileImagePreview}
                          alt="Vista previa"
                          className="w-full h-full object-cover rounded-lg border-2 border-yellow-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setProfileImageFile(null)
                            setProfileImagePreview('')
                            setFormData({ ...formData, profile_image_url: '' })
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    <Input
                      id="profile_image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setProfileImageFile(file)
                          // Crear preview
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            setProfileImagePreview(reader.result as string)
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Formato: JPG, PNG. Tamaño máximo: 5MB
                    </p>
                  </div>
                </div>
              )}

              {/* Campos de pago - Mostrar si el lote tiene precio */}
              {selectedLotePrecio > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">
                      {selectedInvitado ? 'Editar Pago' : 'Información de Pago'}
                    </h4>
                    <Badge variant="outline" className="text-base font-bold">
                      ${selectedLotePrecio.toFixed(2)}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="metodo_pago">Método de Pago *</Label>
                    <Select
                      value={formData.metodo_pago}
                      onValueChange={(value: MetodoPago) => {
                        setFormData({
                          ...formData,
                          metodo_pago: value,
                          // Auto-completar montos según método
                          monto_efectivo: value === 'efectivo' ? selectedLotePrecio.toString() : '0',
                          monto_transferencia: value === 'transferencia' ? selectedLotePrecio.toString() : '0',
                        })
                      }}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar método" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                        <SelectItem value="transferencia">Transferencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Campo opcional de observaciones */}
                  {formData.metodo_pago && (
                    <div className="space-y-2">
                      <Label htmlFor="observaciones">Observaciones (opcional)</Label>
                      <Input
                        id="observaciones"
                        value={formData.observaciones}
                        onChange={(e) =>
                          setFormData({ ...formData, observaciones: e.target.value })
                        }
                        placeholder="Ej: Transferencia a cuenta XXX"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="fixed md:static bottom-5 md:bottom-0 left-0 right-0 bg-white dark:bg-slate-950 border-t p-4 flex flex-row gap-2 md:justify-end shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={uploadingImage}
                className="flex-1 md:flex-none h-12"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={uploadingImage} className="flex-1 md:flex-none h-12">
                {uploadingImage ? 'Subiendo...' : selectedInvitado ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog QR */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogPortal>
          <DialogPrimitive.Overlay className={cn(
            "fixed inset-0 z-50 bg-white dark:bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )} />
          <DialogPrimitive.Content
            className={cn(
              "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-md"
            )}
          >
            <DialogHeader>
              <DialogTitle>Código QR del Invitado</DialogTitle>
              <DialogDescription>
                Comparte este QR con tu invitado
              </DialogDescription>
            </DialogHeader>

            {selectedInvitado && (
              <div className="space-y-4 py-4">
                {/* Información del invitado */}
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold">
                    {selectedInvitado.nombre} {selectedInvitado.apellido}
                  </h3>
                </div>

                {/* Información del evento */}
                {selectedInvitado.evento && (
                  <div className="relative overflow-hidden rounded-lg border">
                    {/* Banner de fondo */}
                    {selectedInvitado.evento.banner_url ? (
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${selectedInvitado.evento.banner_url})` }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-slate-50 dark:bg-slate-900" />
                    )}

                    {/* Overlay oscuro */}
                    <div className="absolute inset-0 bg-black/60" />

                    {/* Contenido */}
                    <div className="relative flex items-center justify-center gap-2 p-3">
                      <Calendar className="h-4 w-4 text-white" />
                      <span className="font-medium text-white">{selectedInvitado.evento.nombre}</span>
                    </div>
                  </div>
                )}

                {/* Información del lote */}
                {selectedInvitado.lote && (
                  <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{selectedInvitado.lote.nombre}</span>
                        {selectedInvitado.lote.es_vip && (
                          <Badge className="bg-yellow-500 gap-1">
                            <Crown className="h-3 w-3" />
                            VIP
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <DollarSign className="h-3 w-3" />
                        {selectedInvitado.lote.precio === 0 ? (
                          <span className="text-green-600 font-medium">GRATIS</span>
                        ) : (
                          <span className="font-medium">${selectedInvitado.lote.precio.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                    {user && (
                      <div className="text-xs text-muted-foreground text-center pt-1 border-t">
                        Entrada Generada por: {user.personal.nombre} {user.personal.apellido}
                      </div>
                    )}
                  </div>
                )}

                {/* Mensaje de derecho de admisión */}
                <p className="text-xs text-muted-foreground text-center">
                  El club se reserva el derecho de admisión
                </p>

                {/* QR Code */}
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <QRCodeSVG
                    id={`qr-${selectedInvitado.id}`}
                    value={selectedInvitado.qr_code}
                    size={240}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <div className="text-center text-xs text-muted-foreground font-mono">
                  {selectedInvitado.qr_code}
                </div>

                {/* Mensaje de advertencia */}
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-900 dark:text-amber-100 text-center font-medium">
                    El QR es único. No lo compartas con nadie o deberás abonar tu entrada nuevamente.
                  </p>
                </div>

                {/* Botón cerrar con logos */}
                <div className="flex items-center justify-between gap-2">
                  <img
                    src="/sponsor/heineken.webp"
                    alt="Heineken"
                    className="h-28 w-auto object-contain"
                  />
                  <Button
                    onClick={() => {
                      setQrDialogOpen(false)
                      setSelectedInvitado(null)
                    }}
                    size="default"
                    className="flex-shrink-0 px-8"
                  >
                    Cerrar
                  </Button>
                  <img
                    src="/sponsor/speed.webp"
                    alt="Speed"
                    className="h-28 w-auto object-contain"
                  />
                </div>
              </div>
            )}

            <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      {/* Dialog Eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el invitado "
              {selectedInvitado?.nombre} {selectedInvitado?.apellido}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedInvitado(null)}>
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
    </div>
  )
}
