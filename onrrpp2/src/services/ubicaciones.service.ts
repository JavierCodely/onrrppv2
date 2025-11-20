import { supabase } from '../lib/supabase'

export interface Ubicacion {
  id: string
  departamento: string
  localidad: string
  created_at: string
  updated_at: string
}

export const ubicacionesService = {
  /**
   * Obtener todos los departamentos únicos
   */
  async getDepartamentos(): Promise<{ data: string[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('ubicaciones')
        .select('departamento')
        .order('departamento', { ascending: true })

      if (error) throw error

      // Extraer valores únicos
      const departamentos = [...new Set(data?.map(u => u.departamento) || [])]

      return { data: departamentos, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Buscar departamentos por texto (autocomplete)
   */
  async searchDepartamentos(searchTerm: string): Promise<{ data: string[] | null; error: Error | null }> {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return this.getDepartamentos()
      }

      const { data, error } = await supabase
        .from('ubicaciones')
        .select('departamento')
        .ilike('departamento', `%${searchTerm}%`)
        .order('departamento', { ascending: true })

      if (error) throw error

      // Extraer valores únicos
      const departamentos = [...new Set(data?.map(u => u.departamento) || [])]

      return { data: departamentos, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Obtener localidades de un departamento específico
   */
  async getLocalidadesByDepartamento(departamento: string): Promise<{ data: string[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('ubicaciones')
        .select('localidad')
        .eq('departamento', departamento)
        .order('localidad', { ascending: true })

      if (error) throw error

      const localidades = data?.map(u => u.localidad) || []

      return { data: localidades, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Buscar localidades por texto (autocomplete)
   * Si se proporciona departamento, filtra por ese departamento
   */
  async searchLocalidades(
    searchTerm: string,
    departamento?: string
  ): Promise<{ data: string[] | null; error: Error | null }> {
    try {
      let query = supabase
        .from('ubicaciones')
        .select('localidad')
        .ilike('localidad', `%${searchTerm}%`)

      if (departamento) {
        query = query.eq('departamento', departamento)
      }

      const { data, error } = await query.order('localidad', { ascending: true })

      if (error) throw error

      // Extraer valores únicos
      const localidades = [...new Set(data?.map(u => u.localidad) || [])]

      return { data: localidades, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Obtener todas las ubicaciones
   */
  async getAllUbicaciones(): Promise<{ data: Ubicacion[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('ubicaciones')
        .select('*')
        .order('departamento', { ascending: true })
        .order('localidad', { ascending: true })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },
}
