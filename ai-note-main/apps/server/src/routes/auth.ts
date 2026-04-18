import type { FastifyInstance } from 'fastify'
import { UserService } from '../services/user-service'
import { getDatabase } from '../db'

export async function authRoutes(fastify: FastifyInstance) {
  const userService = new UserService(getDatabase())

  // Register
  fastify.post<{
    Body: { email: string; username: string; password: string }
  }>('/register', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['email', 'username', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          username: { type: 'string', minLength: 1, maxLength: 50 },
          password: { type: 'string', minLength: 6, maxLength: 128 },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { email, username, password } = request.body
      const user = await userService.createUser(email, username, password)
      const token = fastify.jwt.sign({ sub: user.id, email: user.email })
      return { user, token }
    } catch (err: any) {
      if (err.message === 'Email already registered') {
        return reply.status(409).send({ message: err.message })
      }
      throw err
    }
  })

  // Login
  fastify.post<{
    Body: { email: string; password: string }
  }>('/login', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { email, password } = request.body
      const user = await userService.validateCredentials(email, password)
      const token = fastify.jwt.sign({ sub: user.id, email: user.email })
      return { user, token }
    } catch (err: any) {
      if (err.message === 'Invalid email or password') {
        return reply.status(401).send({ message: err.message })
      }
      throw err
    }
  })

  // Validate token
  fastify.get('/validate', {
    onRequest: [fastify.authenticate],
  }, async (request) => {
    const userService = new UserService(getDatabase())
    const user = userService.findById(request.user.sub)
    return { valid: true, user }
  })
}
