import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import { config } from './config'
import { initDatabase } from './db'
import { authPlugin } from './plugins/auth'
import { authRoutes } from './routes/auth'
import { userRoutes } from './routes/user'
import { healthRoutes } from './routes/health'
import { feedbackRoutes } from './routes/feedback'
import { analyticsRoutes } from './routes/analytics'
import { adminRoutes } from './routes/admin'
import { releasesRoutes } from './routes/releases'
import { logger } from './utils/logger'

async function main() {
  const server = Fastify({ logger: true })

  // Plugins
  await server.register(cors, { origin: true })
  await server.register(rateLimit, { max: 100, timeWindow: '1 minute' })
  await server.register(multipart, { limits: { fileSize: 500 * 1024 * 1024 } })
  await server.register(authPlugin)

  // Database
  await initDatabase(config.dbPath)

  // Routes
  await server.register(authRoutes, { prefix: '/api/auth' })
  await server.register(userRoutes, { prefix: '/api/user' })
  await server.register(healthRoutes, { prefix: '/api' })
  await server.register(feedbackRoutes, { prefix: '/api/feedback' })
  await server.register(analyticsRoutes, { prefix: '/api/analytics' })
  await server.register(adminRoutes)
  await server.register(releasesRoutes)

  // Start
  try {
    await server.listen({ port: config.port, host: config.host })
    logger.info(`Server running at http://${config.host}:${config.port}`)
  } catch (err) {
    logger.error('Failed to start server:', err)
    process.exit(1)
  }
}

main()
