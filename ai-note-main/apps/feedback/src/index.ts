import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import { initDatabase } from './db/index.js'
import { feedbackRoutes } from './routes/feedback.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PORT = parseInt(process.env.FEEDBACK_PORT || '3457')
const HOST = process.env.FEEDBACK_HOST || '0.0.0.0'
const DB_PATH = process.env.FEEDBACK_DB_PATH || path.join(__dirname, '..', 'data', 'feedback.sqlite')

async function main() {
  const server = Fastify({ logger: true })

  await server.register(cors, { origin: true })

  // Serve admin panel
  await server.register(fastifyStatic, {
    root: path.join(__dirname, '..', 'public'),
    prefix: '/admin',
  })

  // Redirect /admin to /admin/
  server.get('/admin', async (_request, reply) => {
    return reply.redirect('/admin/')
  })

  await initDatabase(DB_PATH)
  await server.register(feedbackRoutes)

  try {
    await server.listen({ port: PORT, host: HOST })
    console.log(`[feedback] Server running at http://${HOST}:${PORT}`)
    console.log(`[feedback] Admin panel: http://localhost:${PORT}/admin/`)
  } catch (err) {
    console.error('[feedback] Failed to start server:', err)
    process.exit(1)
  }
}

main()
