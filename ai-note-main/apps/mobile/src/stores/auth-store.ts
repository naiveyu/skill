import { create } from 'zustand'
import type { AuthUser } from '@ai-note/shared-types'
import { authService } from '@/services/auth-service'

interface AuthStoreState {
  isAuthenticated: boolean
  user: AuthUser | null
  isLoading: boolean
  error: string | null

  loadAuthState: () => Promise<void>
  register: (email: string, username: string, password: string) => Promise<boolean>
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,

  loadAuthState: async () => {
    await authService.loadServerUrl()
    await authService.loadCachedAuth()
    const state = authService.getState()
    set({
      isAuthenticated: state.isAuthenticated,
      user: state.user,
    })
  },

  register: async (email, username, password) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authService.register({ email, username, password })
      set({ isAuthenticated: true, user: response.user, isLoading: false })
      return true
    } catch (error: any) {
      set({ isLoading: false, error: error.message })
      return false
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authService.login({ email, password })
      set({ isAuthenticated: true, user: response.user, isLoading: false })
      return true
    } catch (error: any) {
      set({ isLoading: false, error: error.message })
      return false
    }
  },

  logout: async () => {
    await authService.logout()
    set({ isAuthenticated: false, user: null })
  },

  clearError: () => set({ error: null }),
}))
