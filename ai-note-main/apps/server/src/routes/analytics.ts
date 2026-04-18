import type { FastifyInstance } from 'fastify'
import { getDatabase, persist } from '../db'
import { logger } from '../utils/logger'

export async function analyticsRoutes(fastify: FastifyInstance) {
  const db = getDatabase()

  // Create analytics table
  db.run(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      user_id TEXT,
      user_email TEXT,
      event TEXT NOT NULL DEFAULT 'app_open',
      app_version TEXT,
      platform TEXT,
      duration INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
  db.run(`CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_analytics_device ON analytics_events(device_id);`)

  // Add duration column if missing (migration for existing DBs)
  try {
    db.run(`ALTER TABLE analytics_events ADD COLUMN duration INTEGER DEFAULT NULL;`)
  } catch {
    // Column already exists
  }

  persist()

  // Report event (no auth required)
  fastify.post<{
    Body: {
      deviceId: string
      userId?: string
      userEmail?: string
      event?: string
      appVersion?: string
      platform?: string
      duration?: number
    }
  }>('/event', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['deviceId'],
        properties: {
          deviceId: { type: 'string', minLength: 1 },
          userId: { type: 'string' },
          userEmail: { type: 'string' },
          event: { type: 'string' },
          appVersion: { type: 'string' },
          platform: { type: 'string' },
          duration: { type: 'number' },
        },
      },
    },
  }, async (request) => {
    const { deviceId, userId, userEmail, event, appVersion, platform, duration } = request.body

    db.run(
      `INSERT INTO analytics_events (device_id, user_id, user_email, event, app_version, platform, duration)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [deviceId, userId || null, userEmail || null, event || 'app_open', appVersion || null, platform || null, duration ?? null]
    )
    persist()

    logger.info(`Analytics event: ${event || 'app_open'} from ${deviceId.substring(0, 8)}...${duration ? ` duration=${duration}s` : ''}`)
    return { success: true }
  })
}
