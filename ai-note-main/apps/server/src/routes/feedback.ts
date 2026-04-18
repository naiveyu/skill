import type { FastifyInstance } from 'fastify'
import { getDatabase, persist } from '../db'
import crypto from 'node:crypto'
import { logger } from '../utils/logger'

export async function feedbackRoutes(fastify: FastifyInstance) {
  const db = getDatabase()

  // Create feedback table if not exists
  db.run(`
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('bug', 'feature', 'suggestion', 'other')),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      images TEXT,
      user_email TEXT,
      user_name TEXT,
      app_version TEXT,
      platform TEXT,
      device_info TEXT,
      metadata TEXT,
      product_id TEXT DEFAULT 'ai-note',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Add columns for SDK compatibility (ignore if already exists)
  for (const col of ['device_info TEXT', 'metadata TEXT', 'product_id TEXT']) {
    try { db.run(`ALTER TABLE feedback ADD COLUMN ${col}`) } catch { /* already exists */ }
  }
  persist()

  // Submit feedback (no auth required, compatible with SDK)
  fastify.post<{
    Body: {
      type: string
      title?: string
      content?: string
      description?: string
      images?: string[]
      contact?: string
      userEmail?: string
      userName?: string
      appVersion?: string
      platform?: string
      device_info?: string
      metadata?: Record<string, unknown>
      product_id?: string
    }
  }>('/submit', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['type'],
        properties: {
          type: { type: 'string' },
          title: { type: 'string', maxLength: 200 },
          content: { type: 'string', maxLength: 5000 },
          description: { type: 'string', maxLength: 5000 },
          images: { type: 'array', items: { type: 'string' }, maxItems: 5 },
          contact: { type: 'string' },
          userEmail: { type: 'string' },
          userName: { type: 'string' },
          appVersion: { type: 'string' },
          platform: { type: 'string' },
          device_info: { type: 'string' },
          metadata: { type: 'object' },
          product_id: { type: 'string' },
        },
      },
    },
  }, async (request) => {
    const body = request.body
    const id = crypto.randomUUID()
    const meta = body.metadata as Record<string, any> | undefined

    // SDK sends content, old client sends description
    const desc = body.description || body.content || ''
    const title = body.title || desc.slice(0, 100) || 'Untitled'
    const userEmail = body.userEmail || meta?.userEmail || body.contact || null
    const userName = body.userName || meta?.userName || null
    const appVersion = body.appVersion || meta?.appVersion || null
    const platform = body.platform || meta?.platform || null

    db.run(
      `INSERT INTO feedback (id, type, title, description, images, user_email, user_name, app_version, platform, device_info, metadata, product_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, body.type, title, desc,
        body.images ? JSON.stringify(body.images) : null,
        userEmail, userName, appVersion, platform,
        body.device_info || null,
        meta ? JSON.stringify(meta) : null,
        body.product_id || 'ai-note',
      ]
    )
    persist()

    logger.info(`Feedback received: [${body.type}] ${title}`)
    return { success: true, id, created_at: new Date().toISOString() }
  })

  // List all feedback (for admin)
  fastify.get('/list', async () => {
    const results = db.exec('SELECT * FROM feedback ORDER BY created_at DESC LIMIT 100')
    if (!results.length) return { feedback: [] }

    const columns = results[0].columns
    const rows = results[0].values.map((row) => {
      const obj: Record<string, any> = {}
      columns.forEach((col, i) => {
        obj[col] = row[i]
      })
      if (obj.images) {
        try { obj.images = JSON.parse(obj.images) } catch { /* keep as string */ }
      }
      return obj
    })
    return { feedback: rows }
  })
}
