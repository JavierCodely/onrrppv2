import { create } from 'zustand'
import type { AuthUser } from '@/types/database'
import { authService } from '@/services/auth.service'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  initialized: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  signIn: async (email: string, password: string) => {
    set({ loading: true })
    const { user, error } = await authService.signIn(email, password)
    set({ user, loading: false })
    return { error }
  },

  signOut: async () => {
    set({ loading: true })
    await authService.signOut()
    set({ user: null, loading: false })
  },

  initialize: async () => {
    set({ loading: true })
    const { user } = await authService.getCurrentUser()
    set({ user, loading: false, initialized: true })
  },
}))
