import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = typeof import.meta.dirname === 'string'
  ? import.meta.dirname
  : path.dirname(fileURLToPath(import.meta.url))

const DATA_DIR = path.join(__dirname, '..', 'data')

function getOrCreateJwtSecret(): string {
  const secretPath = path.join(DATA_DIR, 'secret.key')
  if (fs.existsSync(secretPath)) {
    return fs.readFileSync(secretPath, 'utf-8').trim()
  }
  const secret = crypto.randomBytes(64).toString('hex')
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(secretPath, secret, 'utf-8')
  return secret
}

export const config = {
  port: Number(process.env.PORT) || 3456,
  host: process.env.HOST || '0.0.0.0',
  dbPath: path.join(DATA_DIR, 'inote-auth.sqlite'),
  jwtSecret: getOrCreateJwtSecret(),
  jwtExpiresIn: '30d',
  adminKey: process.env.ADMIN_KEY || 'inote-admin-2024',
}
