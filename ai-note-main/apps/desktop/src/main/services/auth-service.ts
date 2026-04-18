import fs from 'fs/promises'
import path from 'path'
import type { AuthUser, AuthCredentials, AuthRegisterData, AuthResponse, AuthState } from '@ai-note/shared-types'
import { AUTH_SERVER_DEFAULT_PORT } from '@ai-note/shared-types'
import { logger } from '../utils/logger'

export class AuthService {
  private serverUrl: string
  private token: string | null = null
  private user: AuthUser | null = null
  private cachePath: string

  constructor(appDataPath: string) {
    this.serverUrl = process.env.NODE_ENV === 'development'
      ? `http://localhost:${AUTH_SERVER_DEFAULT_PORT || 3456}`
      : 'https://sspprriinngg.cn'
    this.cachePath = path.join(appDataPath, 'auth.json')
  }

  async loadCachedAuth(): Promise<void> {
    try {
      const data = await fs.readFile(this.cachePath, 'utf-8')
      const cached = JSON.parse(data)
      this.token = cached.token || null
      this.user = cached.user || null
      if (this.token) {
        logger.info('Loaded cached auth for', this.user?.email)
      }
    } catch {
      // No cached auth, that's fine
    }
  }

  private async saveCache(): Promise<void> {
    const data = JSON.stringify({ token: this.token, user: this.user, serverUrl: this.serverUrl })
    await fs.writeFile(this.cachePath, data, 'utf-8')
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
    this.token = result.token
    this.user = result.user
    await this.saveCache()
    return result
  }

  async login(credentials: AuthCredentials): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>('POST', '/api/auth/login', credentials)
    this.token = result.token
    this.user = result.user
    await this.saveCache()
    return result
  }

  async validateToken(): Promise<boolean> {
    if (!this.token) return false
    try {
      await this.request('GET', '/api/auth/validate')
      return true
    } catch {
      return false
    }
  }

  getAuthState(): AuthState {
    return {
      isAuthenticated: !!this.token && !!this.user,
      user: this.user,
      token: this.token,
    }
  }

  async logout(): Promise<void> {
    this.token = null
    this.user = null
    await this.saveCache()
  }

  async updateProfile(data: { username?: string; password?: string }): Promise<AuthUser> {
    const user = await this.request<AuthUser>('PUT', '/api/user/profile', data)
    this.user = user
    await this.saveCache()
    return user
  }

  getServerUrl(): string {
    return this.serverUrl
  }

  setServerUrl(url: string): void {
    this.serverUrl = url
  }
}
