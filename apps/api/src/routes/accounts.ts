import type { FastifyPluginAsync } from 'fastify'
import { accountManager } from '../services/account-manager'

export const accountRoutes: FastifyPluginAsync = async (app) => {

  app.get<{ Params: { userId: string } }>('/:userId', async (req, reply) => {
    try {
      const accounts = await accountManager.listAccounts(req.params.userId)
      return { success: true, data: accounts, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  app.post<{
    Body: {
      user_id: string; name: string
      api_key: string; api_secret: string; passphrase: string
      label_color?: string; note?: string; make_default?: boolean
    }
  }>('/', async (req, reply) => {
    const { user_id, name, api_key, api_secret, passphrase, label_color, note, make_default } = req.body
    if (!user_id || !name || !api_key || !api_secret || !passphrase) {
      return reply.status(400).send({
        success: false, error: 'user_id, name, api_key, api_secret, passphrase required', timestamp: Date.now(),
      })
    }
    try {
      const account = await accountManager.addAccount(user_id, {
        name, apiKey: api_key, apiSecret: api_secret, passphrase,
        labelColor: label_color, note, makeDefault: make_default,
      })
      return { success: true, data: account, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  app.patch<{
    Params: { userId: string; id: string }
    Body: { name?: string; label_color?: string; note?: string; is_active?: boolean }
  }>('/:userId/:id', async (req, reply) => {
    try {
      const account = await accountManager.updateAccount(req.params.userId, req.params.id, {
        name: req.body.name,
        labelColor: req.body.label_color,
        note: req.body.note,
        isActive: req.body.is_active,
      })
      return { success: true, data: account, timestamp: Date.now() }
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
    }
  })

  app.post<{ Params: { userId: string; id: string } }>(
    '/:userId/:id/set-default', async (req, reply) => {
      try {
        await accountManager.setDefault(req.params.userId, req.params.id)
        return { success: true, data: null, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )

  app.post<{ Params: { userId: string; id: string } }>(
    '/:userId/:id/test', async (req, reply) => {
      try {
        const result = await accountManager.testConnection(req.params.userId, req.params.id)
        return { success: result.success, data: result, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )

  app.delete<{ Params: { userId: string; id: string } }>(
    '/:userId/:id', async (req, reply) => {
      try {
        await accountManager.deleteAccount(req.params.userId, req.params.id)
        return { success: true, data: null, timestamp: Date.now() }
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )
}
