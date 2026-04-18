import initSqlJs, { type Database } from 'sql.js'
import fs from 'node:fs'
import path from 'node:path'

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
    CREATE TABLE IF NOT EXISTS feedbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'suggestion',
      content TEXT NOT NULL,
      contact TEXT,
      device_info TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'pending'
    );
  `)
  db.run(`CREATE INDEX IF NOT EXISTS idx_product ON feedbacks(product_id);`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_status ON feedbacks(status);`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_created ON feedbacks(created_at);`)

  persist()
  console.log(`[feedback] Database initialized at ${dbPath}`)
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
