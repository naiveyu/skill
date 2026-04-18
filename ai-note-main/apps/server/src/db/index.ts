import initSqlJs, { type Database } from 'sql.js'
import fs from 'node:fs'
import path from 'node:path'
import { logger } from '../utils/logger'

let db: Database
let dbPath: string

export async function initDatabase(filePath: string): Promise<Database> {
  dbPath = filePath
  const SQL = await initSqlJs()

  const dir = path.dirname(dbPath)
  fs.mkdirSync(dir, { recursive: true })

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login_at TEXT
    );
  `)
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`)

  persist()
  logger.info('Database initialized at', dbPath)
  return db
}

export function getDatabase(): Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

export function persist(): void {
  if (!db || !dbPath) return
  const data = db.export()
  fs.writeFileSync(dbPath, Buffer.from(data))
}
