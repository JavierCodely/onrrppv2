import { supabase } from '@/lib/supabase'
import type { Venta, VentaConDetalles, MetodoPago } from '@/types/database'

export interface CreateVentaInput {
  uuid_invitado: string
  uuid_evento: string
  uuid_lote: string
  id_rrpp: string
  metodo_pago: MetodoPago
  monto_total: number
  monto_efectivo: number
  monto_transferencia: number
  observaciones?: string
}

export interface UpdateVentaInput {
  metodo_pago?: MetodoPago
  monto_efectivo?: number
  monto_transferencia?: number
  observaciones?: string
}

export interface VentasStats {
  total_ventas: number
  total_efectivo: number
  total_transferencia: number
  total_mixto: number
  monto_total_efectivo: number
  monto_total_transferencia: number
  monto_total_general: number
}

class VentasService {
  /**
   * Create a new sale record
   */
  async createVenta(data: CreateVentaInput): Promise<Venta> {
    const { data: venta, error } = await supabase
      .from('ventas')
      .insert(data)
      .select()
      .single()

    if (error) {
      console.error('Error creating venta:', error)
      throw new Error(error.message)
    }

    return venta
  }

  /**
   * Get sale by invitado ID
   */
  async getVentaByInvitado(uuid_invitado: string): Promise<Venta | null> {
    const { data, error } = await supabase
      .from('ventas')
      .select('*')
      .eq('uuid_invitado', uuid_invitado)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null
      }
      // Si la tabla no existe o hay problemas con RLS (error 406), retornar null silenciosamente
      if (error.code === 'PGRST301' || error.message.includes('406')) {
        console.warn('Tabla ventas no disponible o sin permisos RLS')
        return null
      }
      console.error('Error fetching venta:', error)
      throw new Error(error.message)
    }

    return data
  }

  /**
   * Get all sales for an event with details
   */
  async getVentasByEvento(uuid_evento: string): Promise<VentaConDetalles[]> {
    const { data, error } = await supabase
      .from('ventas')
      .select(`
        *,
        invitado:invitados!uuid_invitado(nombre, apellido, dni),
        evento:eventos!uuid_evento(nombre),
        lote:lotes!uuid_lote(nombre, precio),
        rrpp:personal!id_rrpp(nombre, apellido)
      `)
      .eq('uuid_evento', uuid_evento)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching ventas by evento:', error)
      throw new Error(error.message)
    }

    return data as unknown as VentaConDetalles[]
  }

  /**
   * Get all sales made by a specific RRPP
   */
  async getVentasByRRPP(id_rrpp: string, uuid_evento?: string): Promise<VentaConDetalles[]> {
    let query = supabase
      .from('ventas')
      .select(`
        *,
        invitado:invitados!uuid_invitado(nombre, apellido, dni),
        evento:eventos!uuid_evento(nombre),
        lote:lotes!uuid_lote(nombre, precio),
        rrpp:personal!id_rrpp(nombre, apellido)
      `)
      .eq('id_rrpp', id_rrpp)

    if (uuid_evento) {
      query = query.eq('uuid_evento', uuid_evento)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching ventas by RRPP:', error)
      throw new Error(error.message)
    }

    return data as unknown as VentaConDetalles[]
  }

  /**
   * Get sales statistics for an event
   */
  async getVentasStatsByEvento(uuid_evento: string): Promise<VentasStats> {
    const { data, error } = await supabase
      .from('ventas')
      .select('metodo_pago, monto_total, monto_efectivo, monto_transferencia')
      .eq('uuid_evento', uuid_evento)

    if (error) {
      console.error('Error fetching ventas stats:', error)
      throw new Error(error.message)
    }

    const stats: VentasStats = {
      total_ventas: data.length,
      total_efectivo: 0,
      total_transferencia: 0,
      total_mixto: 0,
      monto_total_efectivo: 0,
      monto_total_transferencia: 0,
      monto_total_general: 0,
    }

    data.forEach((venta) => {
      stats.monto_total_general += Number(venta.monto_total)
      stats.monto_total_efectivo += Number(venta.monto_efectivo)
      stats.monto_total_transferencia += Number(venta.monto_transferencia)

      if (venta.metodo_pago === 'efectivo') {
        stats.total_efectivo++
      } else if (venta.metodo_pago === 'transferencia') {
        stats.total_transferencia++
      } else if (venta.metodo_pago === 'mixto') {
        stats.total_mixto++
      }
    })

    return stats
  }

  /**
   * Get sales statistics for a specific RRPP
   */
  async getVentasStatsByRRPP(id_rrpp: string, uuid_evento?: string): Promise<VentasStats> {
    let query = supabase
      .from('ventas')
      .select('metodo_pago, monto_total, monto_efectivo, monto_transferencia')
      .eq('id_rrpp', id_rrpp)

    if (uuid_evento) {
      query = query.eq('uuid_evento', uuid_evento)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching ventas stats by RRPP:', error)
      throw new Error(error.message)
    }

    const stats: VentasStats = {
      total_ventas: data.length,
      total_efectivo: 0,
      total_transferencia: 0,
      total_mixto: 0,
      monto_total_efectivo: 0,
      monto_total_transferencia: 0,
      monto_total_general: 0,
    }

    data.forEach((venta) => {
      stats.monto_total_general += Number(venta.monto_total)
      stats.monto_total_efectivo += Number(venta.monto_efectivo)
      stats.monto_total_transferencia += Number(venta.monto_transferencia)

      if (venta.metodo_pago === 'efectivo') {
        stats.total_efectivo++
      } else if (venta.metodo_pago === 'transferencia') {
        stats.total_transferencia++
      } else if (venta.metodo_pago === 'mixto') {
        stats.total_mixto++
      }
    })

    return stats
  }

  /**
   * Update a sale record
   */
  async updateVenta(id: string, data: UpdateVentaInput): Promise<Venta> {
    const { data: venta, error } = await supabase
      .from('ventas')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating venta:', error)
      throw new Error(error.message)
    }

    return venta
  }

  /**
   * Delete a sale record (Admin only)
   */
  async deleteVenta(id: string): Promise<void> {
    const { error } = await supabase
      .from('ventas')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting venta:', error)
      throw new Error(error.message)
    }
  }

  /**
   * Check if an invitado has a sale record
   */
  async hasVenta(uuid_invitado: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('ventas')
      .select('id')
      .eq('uuid_invitado', uuid_invitado)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return false
      }
      console.error('Error checking venta:', error)
      throw new Error(error.message)
    }

    return !!data
  }
}

export const ventasService = new VentasService()
