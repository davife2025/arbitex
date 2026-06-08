import type { FastifyRequest, FastifyReply } from 'fastify'
import { supabaseAdmin } from '../services/supabase'

export async function authMiddleware(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ success: false, error: 'Unauthorized', timestamp: Date.now() })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    return reply.status(401).send({ success: false, error: 'Invalid token', timestamp: Date.now() })
  }

  // Attach user to request
  ;(req as any).user = user
}

// Decorator to extract user_id safely
export function getUserId(req: FastifyRequest): string {
  return (req as any).user?.id ?? ''
}
