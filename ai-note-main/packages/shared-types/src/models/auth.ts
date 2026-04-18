// ========== Auth Types ==========

export interface AuthUser {
  id: string
  email: string
  username: string
  createdAt?: string
}

export interface AuthCredentials {
  email: string
  password: string
}

export interface AuthRegisterData {
  email: string
  username: string
  password: string
}

export interface AuthResponse {
  user: AuthUser
  token: string
}

export interface AuthState {
  isAuthenticated: boolean
  user: AuthUser | null
  token: string | null
}

export interface AuthValidateResponse {
  valid: boolean
  user: AuthUser
}
