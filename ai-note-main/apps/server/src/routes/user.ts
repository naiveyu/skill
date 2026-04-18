import type { FastifyInstance } from 'fastify'
import { UserService } from '../services/user-service'
import { getDatabase } from '../db'

export async function userRoutes(fastify: FastifyInstance) {
  // All routes in this plugin require authentication
  fastify.addHook('onRequest', fastify.authenticate)

  const userService = new UserService(getDatabase())

  // Get profile
  fastify.get('/profile', async (request, reply) => {
    const user = userService.findById(request.user.sub)
    if (!user) {
      return reply.status(404).send({ message: 'User not found' })
    }
    return user
  })

  // Update profile
  fastify.put<{
    Body: { username?: string; password?: string }
  }>('/profile', {
    schema: {
      body: {
        type: 'object',
        properties: {
          username: { type: 'string', minLength: 1, maxLength: 50 },
          password: { type: 'string', minLength: 6, maxLength: 128 },
        },
      },
    },
  }, async (request, reply) => {
    const { username, password } = request.body
    if (!username && !password) {
      return reply.status(400).send({ message: 'No fields to update' })
    }
    const user = await userService.updateProfile(request.user.sub, { username, password })
    return user
  })
}
