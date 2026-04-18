import type { FastifyInstance } from 'fastify'
import { getDatabase, persist } from '../db/index.js'
import type { SubmitFeedbackBody, UpdateStatusBody, ListQuery, StatsQuery, Feedback } from '../types.js'

const VALID_TYPES = ['bug', 'suggestion', 'other']
const VALID_STATUSES = ['pending', 'reviewed', 'resolved', 'ignored']

export async function feedbackRoutes(app: FastifyInstance) {
  // Submit feedback
  app.post<{ Body: SubmitFeedbackBody }>('/api/feedback', async (request, reply) => {
    const { product_id, type, content, contact, device_info, metadata } = request.body

    if (!product_id || !content) {
      return reply.status(400).send({ error: 'product_id and content are required' })
    }
    if (type && !VALID_TYPES.includes(type)) {
      return reply.status(400).send({ error: `type must be one of: ${VALID_TYPES.join(', ')}` })
    }

    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO feedbacks (product_id, type, content, contact, device_info, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    stmt.run([
      product_id,
      type || 'suggestion',
      content,
      contact || null,
      typeof device_info === 'object' ? JSON.stringify(device_info) : device_info || null,
      metadata ? JSON.stringify(metadata) : null
    ])
    stmt.free()

    const result = db.exec('SELECT last_insert_rowid() as id, datetime("now") as created_at')
    persist()

    return reply.status(201).send({
      id: result[0].values[0][0],
      created_at: result[0].values[0][1]
    })
  })

  // List feedbacks (with filters + pagination)
  app.get<{ Querystring: ListQuery }>('/api/feedbacks', async (request, reply) => {
    const { product_id, type, status, page = '1', page_size = '20' } = request.query
    const pageNum = Math.max(1, parseInt(page))
    const size = Math.min(100, Math.max(1, parseInt(page_size)))
    const offset = (pageNum - 1) * size

    const conditions: string[] = []
    const params: (string | number)[] = []

    if (product_id) {
      conditions.push('product_id = ?')
      params.push(product_id)
    }
    if (type && VALID_TYPES.includes(type)) {
      conditions.push('type = ?')
      params.push(type)
    }
    if (status && VALID_STATUSES.includes(status)) {
      conditions.push('status = ?')
      params.push(status)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const db = getDatabase()

    // Get total count
    const countResult = db.exec(`SELECT COUNT(*) FROM feedbacks ${where}`, params)
    const total = countResult[0]?.values[0][0] as number || 0

    // Get items
    const stmt = db.prepare(`
      SELECT * FROM feedbacks ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
    stmt.bind([...params, size, offset])

    const items: Feedback[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject() as unknown as Feedback
      items.push(row)
    }
    stmt.free()

    return reply.send({ items, total, page: pageNum, page_size: size })
  })

  // Update feedback status
  app.patch<{ Params: { id: string }; Body: UpdateStatusBody }>('/api/feedback/:id', async (request, reply) => {
    const { id } = request.params
    const { status } = request.body

    if (!status || !VALID_STATUSES.includes(status)) {
      return reply.status(400).send({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` })
    }

    const db = getDatabase()
    db.run('UPDATE feedbacks SET status = ? WHERE id = ?', [status, parseInt(id)])
    persist()

    return reply.send({ ok: true })
  })

  // Stats
  app.get<{ Querystring: StatsQuery }>('/api/feedbacks/stats', async (request, reply) => {
    const { product_id } = request.query
    const db = getDatabase()

    const where = product_id ? 'WHERE product_id = ?' : ''
    const params = product_id ? [product_id] : []

    // Total
    const totalResult = db.exec(`SELECT COUNT(*) FROM feedbacks ${where}`, params)
    const total = totalResult[0]?.values[0][0] as number || 0

    // By type
    const byTypeResult = db.exec(
      `SELECT type, COUNT(*) as count FROM feedbacks ${where} GROUP BY type`,
      params
    )
    const by_type: Record<string, number> = { bug: 0, suggestion: 0, other: 0 }
    byTypeResult[0]?.values.forEach(([t, c]) => { by_type[t as string] = c as number })

    // By status
    const byStatusResult = db.exec(
      `SELECT status, COUNT(*) as count FROM feedbacks ${where} GROUP BY status`,
      params
    )
    const by_status: Record<string, number> = { pending: 0, reviewed: 0, resolved: 0, ignored: 0 }
    byStatusResult[0]?.values.forEach(([s, c]) => { by_status[s as string] = c as number })

    // Recent 7 days
    const recent7dResult = db.exec(
      `SELECT COUNT(*) FROM feedbacks ${where ? where + ' AND' : 'WHERE'} created_at >= datetime('now', '-7 days')`,
      params
    )
    const recent_7d = recent7dResult[0]?.values[0][0] as number || 0

    return reply.send({ total, by_type, by_status, recent_7d })
  })

  // Product list
  app.get('/api/feedbacks/products', async (_request, reply) => {
    const db = getDatabase()
    const result = db.exec(
      'SELECT product_id, COUNT(*) as count FROM feedbacks GROUP BY product_id ORDER BY count DESC'
    )

    const products = result[0]?.values.map(([product_id, count]) => ({
      product_id,
      count
    })) || []

    return reply.send(products)
  })

  // Delete feedback
  app.delete<{ Params: { id: string } }>('/api/feedback/:id', async (request, reply) => {
    const { id } = request.params
    const db = getDatabase()
    db.run('DELETE FROM feedbacks WHERE id = ?', [parseInt(id)])
    persist()
    return reply.send({ ok: true })
  })
}
