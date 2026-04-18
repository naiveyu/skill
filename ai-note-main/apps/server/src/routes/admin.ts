import type { FastifyInstance } from 'fastify'
import fs from 'node:fs'
import path from 'node:path'
import { getDatabase, persist } from '../db'
import { config } from '../config'

const __dirname = typeof import.meta.dirname === 'string'
  ? import.meta.dirname
  : path.dirname(new URL(import.meta.url).pathname)

function verifyAdminKey(key: string | undefined): boolean {
  return key === config.adminKey
}

function queryRows(db: ReturnType<typeof getDatabase>, sql: string, params?: any[]): Record<string, any>[] {
  const stmt = db.prepare(sql)
  if (params) stmt.bind(params)
  const rows: Record<string, any>[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

export async function adminRoutes(fastify: FastifyInstance) {
  const db = getDatabase()

  // Serve admin HTML page
  fastify.get('/admin', async (request, reply) => {
    const { key } = request.query as { key?: string }
    if (!verifyAdminKey(key)) {
      return reply.status(401).send({ message: 'Invalid admin key' })
    }

    const htmlPath = path.join(__dirname, '..', '..', 'public', 'admin.html')
    try {
      const html = fs.readFileSync(htmlPath, 'utf-8')
      reply.type('text/html').send(html)
    } catch {
      return reply.status(500).send({ message: 'Admin page not found' })
    }
  })

  // Admin stats API - UV/PV/duration aggregation with trend data
  fastify.get('/api/admin/stats', async (request, reply) => {
    const { key, days } = request.query as { key?: string; days?: string }
    if (!verifyAdminKey(key)) {
      return reply.status(401).send({ message: 'Invalid admin key' })
    }

    const numDays = Math.min(Number(days) || 7, 365)

    // Today's UV (unique devices with app_open events today)
    const todayUvResult = queryRows(db,
      `SELECT COUNT(DISTINCT device_id) as count FROM analytics_events
       WHERE event = 'app_open' AND date(created_at) = date('now')`
    )
    const todayUv = todayUvResult[0]?.count || 0

    // Today's PV (app_open count today)
    const todayPvResult = queryRows(db,
      `SELECT COUNT(*) as count FROM analytics_events
       WHERE event = 'app_open' AND date(created_at) = date('now')`
    )
    const todayPv = todayPvResult[0]?.count || 0

    // Average duration in recent N days (from app_close events with duration)
    const avgDurResult = queryRows(db,
      `SELECT AVG(duration) as avg_dur FROM analytics_events
       WHERE event = 'app_close' AND duration IS NOT NULL
       AND created_at >= datetime('now', ?)`,
      [`-${numDays} days`]
    )
    const avgDuration = avgDurResult[0]?.avg_dur
      ? Math.round((avgDurResult[0].avg_dur as number) / 60 * 10) / 10  // seconds → minutes, 1 decimal
      : 0

    // Total unique devices ever
    const totalUsersResult = queryRows(db,
      `SELECT COUNT(DISTINCT device_id) as count FROM analytics_events WHERE event = 'app_open'`
    )
    const totalUsers = totalUsersResult[0]?.count || 0

    // Daily trend: UV, PV, avg duration per day
    const trend = queryRows(db,
      `SELECT
        date(created_at) as date,
        COUNT(DISTINCT CASE WHEN event = 'app_open' THEN device_id END) as uv,
        SUM(CASE WHEN event = 'app_open' THEN 1 ELSE 0 END) as pv,
        ROUND(AVG(CASE WHEN event = 'app_close' AND duration IS NOT NULL THEN duration END) / 60.0, 1) as avgDuration
       FROM analytics_events
       WHERE created_at >= datetime('now', ?)
       GROUP BY date(created_at)
       ORDER BY date ASC`,
      [`-${numDays} days`]
    )

    // Per-version UV/PV
    const versionStats = queryRows(db,
      `SELECT
        app_version as version,
        COUNT(DISTINCT device_id) as uv,
        COUNT(*) as pv
       FROM analytics_events
       WHERE event = 'app_open' AND app_version IS NOT NULL
       GROUP BY app_version
       ORDER BY app_version DESC`
    )

    return {
      todayUv,
      todayPv,
      avgDuration,
      totalUsers,
      trend,
      versionStats,
    }
  })

  // Admin feedback list
  fastify.get('/api/admin/feedback', async (request, reply) => {
    const { key } = request.query as { key?: string }
    if (!verifyAdminKey(key)) {
      return reply.status(401).send({ message: 'Invalid admin key' })
    }

    const results = db.exec('SELECT * FROM feedback ORDER BY created_at DESC LIMIT 200')
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

  // Clear analytics data (admin only)
  fastify.delete('/api/admin/analytics', async (request, reply) => {
    const { key } = request.query as { key?: string }
    if (!verifyAdminKey(key)) {
      return reply.status(401).send({ message: 'Invalid admin key' })
    }

    db.run('DELETE FROM analytics_events')
    persist()
    return { success: true, message: 'Analytics data cleared' }
  })
}
