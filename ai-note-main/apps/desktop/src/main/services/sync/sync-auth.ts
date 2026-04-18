import { randomBytes, randomInt } from 'crypto'
import type { AuthToken, PairingInfo } from '@ai-note/shared-types'
import { SYNC_PAIRING_TTL } from '@shared/constants'

const PIN_LENGTH = 6
const TOKEN_BYTES = 32

export function generatePIN(): string {
  const max = Math.pow(10, PIN_LENGTH)
  return String(randomInt(max)).padStart(PIN_LENGTH, '0')
}

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex')
}

export function createPairingInfo(
  deviceId: string,
  ip: string,
  port: number,
  serviceName: string
): PairingInfo {
  const pin = generatePIN()
  const expiresAt = Date.now() + SYNC_PAIRING_TTL

  const qrPayload = JSON.stringify({
    deviceId,
    pin,
    ip,
    port,
    serviceName
  })

  return { pin, qrPayload, expiresAt }
}

export function validatePIN(
  pin: string,
  expected: string,
  expiresAt: number
): boolean {
  if (Date.now() > expiresAt) {
    return false
  }
  // Constant-time comparison to prevent timing attacks
  if (pin.length !== expected.length) {
    return false
  }
  let result = 0
  for (let i = 0; i < pin.length; i++) {
    result |= pin.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return result === 0
}

export function createAuthToken(deviceId: string, deviceName: string): AuthToken {
  return {
    token: generateToken(),
    deviceId,
    deviceName,
    createdAt: Date.now(),
    lastUsed: Date.now()
  }
}

export function validateToken(
  token: string,
  tokenStore: AuthToken[]
): AuthToken | null {
  const found = tokenStore.find((t) => {
    if (t.token.length !== token.length) return false
    let result = 0
    for (let i = 0; i < token.length; i++) {
      result |= token.charCodeAt(i) ^ t.token.charCodeAt(i)
    }
    return result === 0
  })

  if (found) {
    found.lastUsed = Date.now()
  }

  return found ?? null
}
