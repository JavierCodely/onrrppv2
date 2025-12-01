export type UserRole = 'admin' | 'rrpp' | 'seguridad'
export type MetodoPago = 'efectivo' | 'transferencia' | 'mixto'
export type ComisionTipo = 'monto' | 'porcentaje'
export type GrupoType = 'A' | 'B' | 'C' | 'D'

export interface Personal {
  id: string
  nombre: string
  apellido: string
  edad: number | null
  sexo: 'hombre' | 'mujer'
  ubicacion: string | null
  rol: UserRole
  grupo: GrupoType | null
  fecha_nacimiento: string | null
  uuid_club: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Club {
  id: string
  nombre: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Evento {
  id: string
  nombre: string
  fecha: string
  banner_url: string | null
  total_invitados: number
  total_ingresados: number
  uuid_club: string
  estado: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface Lote {
  id: string
  nombre: string
  cantidad_maxima: number
  cantidad_actual: number
  precio: number
  es_vip: boolean
  grupo: GrupoType | null
  comision_tipo: ComisionTipo
  comision_rrpp_monto: number
  comision_rrpp_porcentaje: number
  uuid_evento: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Invitado {
  id: string
  nombre: string
  apellido: string
  edad: number | null
  departamento: string | null
  localidad: string | null
  dni: string
  sexo: 'hombre' | 'mujer'
  uuid_evento: string
  id_rrpp: string
  uuid_lote: string | null
  ingresado: boolean
  fecha_ingreso: string | null
  qr_code: string
  profile_image_url: string | null
  created_at: string
  updated_at: string
}

export interface InvitadoConRRPP extends Invitado {
  rrpp: {
    nombre: string
    apellido: string
  }
}

export interface InvitadoConDetalles extends InvitadoConRRPP {
  lote: Lote | null
  evento: {
    nombre: string
    estado: boolean
  }
}

export interface AuthUser {
  id: string
  email: string
  personal: Personal
  club: Club
}

export interface Venta {
  id: string
  uuid_invitado: string
  uuid_evento: string
  uuid_lote: string
  id_rrpp: string
  metodo_pago: MetodoPago
  monto_total: number
  monto_efectivo: number
  monto_transferencia: number
  observaciones: string | null
  created_at: string
  updated_at: string
}

export interface VentaConDetalles extends Venta {
  invitado: {
    nombre: string
    apellido: string
    dni: string
  }
  evento: {
    nombre: string
  }
  lote: {
    nombre: string
    precio: number
    es_vip: boolean
  }
  rrpp: {
    nombre: string
    apellido: string
  }
}

export interface Ubicacion {
  id: string
  departamento: string
  localidad: string
  created_at: string
  updated_at: string
}

export interface VentasRRPPStats {
  id_rrpp: string
  uuid_evento: string
  uuid_lote: string
  lote_nombre: string
  lote_precio: number
  lote_es_vip: boolean
  comision_tipo: ComisionTipo
  comision_rrpp_monto: number
  comision_rrpp_porcentaje: number
  cantidad_ventas: number
  monto_total_vendido: number
  monto_efectivo: number
  monto_transferencia: number
  comision_total: number
}
