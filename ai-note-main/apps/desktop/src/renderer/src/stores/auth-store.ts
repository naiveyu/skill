import { create } from 'zustand'
import type { AuthUser } from '@shared/types/ipc'

interface AuthStoreState {
  isAuthenticated: boolean
  user: AuthUser | null
  isLoading: boolean
  error: string | null
  serverUrl: string

  loadAuthState: () => Promise<void>
  register: (email: string, username: string, password: string) => Promise<boolean>
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  updateProfile: (data: { username?: string; password?: string }) => Promise<boolean>
  clearError: () => void
  loadServerUrl: () => Promise<void>
  setServerUrl: (url: string) => Promise<void>
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,
  serverUrl: '',

  loadAuthState: async () => {
    try {
      const state = await window.electronAPI.auth.getState()
      const serverUrl = await window.electronAPI.auth.getServerUrl()
      set({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        serverUrl,
      })
    } catch (error) {
      console.error('Failed to load auth state:', error)
    }
  },

  register: async (email, username, password) => {
    set({ isLoading: true, error: null })
    try {
      const response = await window.electronAPI.auth.register({ email, username, password })
      set({ isAuthenticated: true, user: response.user, isLoading: false })
      return true
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Registration failed' })
      return false
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const response = await window.electronAPI.auth.login({ email, password })
      set({ isAuthenticated: true, user: response.user, isLoading: false })
      return true
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Login failed' })
      return false
    }
  },

  logout: async () => {
    try {
      await window.electronAPI.auth.logout()
      set({ isAuthenticated: false, user: null })
    } catch (error) {
      console.error('Failed to logout:', error)
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const user = await window.electronAPI.auth.updateProfile(data)
      set({ user, isLoading: false })
      return true
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Update failed' })
      return false
    }
  },

  clearError: () => set({ error: null }),

  loadServerUrl: async () => {
    const url = await window.electronAPI.auth.getServerUrl()
    set({ serverUrl: url })
  },

  setServerUrl: async (url) => {
    await window.electronAPI.auth.setServerUrl(url)
    set({ serverUrl: url })
  },
}))
