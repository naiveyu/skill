import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { Database } from 'sql.js'
import type { AuthUser } from '@ai-note/shared-types'
import { persist } from '../db'

interface UserRow {
  id: string
  email: string
  username: string
  password_hash: string
  created_at: string
  updated_at: string
  last_login_at: string | null
}

function queryOne(db: Database, sql: string, params: unknown[]): UserRow | undefined {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as UserRow
    stmt.free()
    return row
  }
  stmt.free()
  return undefined
}

export class UserService {
  private db: Database

  constructor(db: Database) {
    this.db = db
  }

  async createUser(email: string, username: string, password: string): Promise<AuthUser> {
    const existing = queryOne(this.db, 'SELECT id FROM users WHERE email = ?', [email])
    if (existing) {
      throw new Error('Email already registered')
    }

    const id = crypto.randomUUID()
    const passwordHash = await bcrypt.hash(password, 10)

    this.db.run(
      'INSERT INTO users (id, email, username, password_hash) VALUES (?, ?, ?, ?)',
      [id, email, username, passwordHash]
    )
    persist()

    return { id, email, username }
  }

  async validateCredentials(email: string, password: string): Promise<AuthUser> {
    const row = queryOne(this.db, 'SELECT * FROM users WHERE email = ?', [email])
    if (!row) {
      throw new Error('Invalid email or password')
    }

    const valid = await bcrypt.compare(password, row.password_hash)
    if (!valid) {
      throw new Error('Invalid email or password')
    }

    this.db.run("UPDATE users SET last_login_at = datetime('now') WHERE id = ?", [row.id])
    persist()

    return { id: row.id, email: row.email, username: row.username, createdAt: row.created_at }
  }

  findById(userId: string): AuthUser | null {
    const row = queryOne(this.db, 'SELECT * FROM users WHERE id = ?', [userId])
    if (!row) return null
    return { id: row.id, email: row.email, username: row.username, createdAt: row.created_at }
  }

  async updateProfile(userId: string, data: { username?: string; password?: string }): Promise<AuthUser> {
    const row = queryOne(this.db, 'SELECT * FROM users WHERE id = ?', [userId])
    if (!row) throw new Error('User not found')

    if (data.username) {
      this.db.run("UPDATE users SET username = ?, updated_at = datetime('now') WHERE id = ?",
        [data.username, userId])
    }

    if (data.password) {
      const hash = await bcrypt.hash(data.password, 10)
      this.db.run("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
        [hash, userId])
    }

    persist()
    return this.findById(userId)!
  }
}
