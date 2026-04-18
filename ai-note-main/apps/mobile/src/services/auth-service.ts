import AsyncStorage from '@react-native-async-storage/async-storage'
import type { AuthUser, AuthResponse, AuthRegisterData, AuthCredentials, AuthState } from '@ai-note/shared-types'
import { AUTH_TOKEN_KEY, AUTH_USER_KEY, AUTH_SERVER_DEFAULT_PORT } from '@ai-note/shared-types'

const SERVER_URL_KEY = 'auth_server_url'

class AuthService {
  private serverUrl: string = `http://10.0.2.2:${AUTH_SERVER_DEFAULT_PORT}` // Android emulator → host
  private token: string | null = null
  private user: AuthUser | null = null

  async loadServerUrl(): Promise<void> {
    const url = await AsyncStorage.getItem(SERVER_URL_KEY)
    if (url) this.serverUrl = url
  }

  async setServerUrl(url: string): Promise<void> {
    this.serverUrl = url
    await AsyncStorage.setItem(SERVER_URL_KEY, url)
  }

  getServerUrl(): string {
    return this.serverUrl
  }

  async loadCachedAuth(): Promise<void> {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY)
    const userJson = await AsyncStorage.getItem(AUTH_USER_KEY)
    if (token && userJson) {
      this.token = token
      this.user = JSON.parse(userJson)
    }
  }

  private async saveAuth(token: string, user: AuthUser): Promise<void> {
    this.token = token
    this.user = user
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token)
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
  }

  private async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const res = await fetch(`${this.serverUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    const json = await res.json() as any
    if (!res.ok) {
      throw new Error(json.message || `Request failed: ${res.status}`)
    }
    return json as T
  }

  async register(data: AuthRegisterData): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>('POST', '/api/auth/register', data)
    await this.saveAuth(result.token, result.user)
    return result
  }

  async login(credentials: AuthCredentials): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>('POST', '/api/auth/login', credentials)
    await this.saveAuth(result.token, result.user)
    return result
  }

  async validate(): Promise<boolean> {
    if (!this.token) return false
    try {
      await this.request('GET', '/api/auth/validate')
      return true
    } catch {
      return false
    }
  }

  getState(): AuthState {
    return {
      isAuthenticated: !!this.token && !!this.user,
      user: this.user,
      token: this.token,
    }
  }

  async logout(): Promise<void> {
    this.token = null
    this.user = null
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY)
    await AsyncStorage.removeItem(AUTH_USER_KEY)
  }
}

export const authService = new AuthService()
