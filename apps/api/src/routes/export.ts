import type { FastifyPluginAsync } from 'fastify'
import { dataExportService } from '../services/data-export'

export const exportRoutes: FastifyPluginAsync = async (app) => {

  // GET /api/export/journal/:userId
  app.get<{ Params: { userId: string } }>(
    '/journal/:userId', async (req, reply) => {
      try {
        const { csv, count } = await dataExportService.exportJournalCSV(req.params.userId)
        reply
          .header('Content-Type', 'text/csv; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="arbitex-journal-${new Date().toISOString().split('T')[0]}.csv"`)
          .header('X-Record-Count', count.toString())
        return reply.send(csv)
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )

  // GET /api/export/performance/:userId
  app.get<{ Params: { userId: string } }>(
    '/performance/:userId', async (req, reply) => {
      try {
        const { csv, count } = await dataExportService.exportPerformanceCSV(req.params.userId)
        reply
          .header('Content-Type', 'text/csv; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="arbitex-performance-${new Date().toISOString().split('T')[0]}.csv"`)
          .header('X-Record-Count', count.toString())
        return reply.send(csv)
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )

  // GET /api/export/signals/:userId
  app.get<{ Params: { userId: string } }>(
    '/signals/:userId', async (req, reply) => {
      try {
        const { csv, count } = await dataExportService.exportSignalsCSV(req.params.userId)
        reply
          .header('Content-Type', 'text/csv; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="arbitex-signals-${new Date().toISOString().split('T')[0]}.csv"`)
          .header('X-Record-Count', count.toString())
        return reply.send(csv)
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )

  // GET /api/export/full/:userId — full JSON dump
  app.get<{ Params: { userId: string } }>(
    '/full/:userId', async (req, reply) => {
      try {
        const { json, count } = await dataExportService.exportFullJSON(req.params.userId)
        reply
          .header('Content-Type', 'application/json; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="arbitex-export-${new Date().toISOString().split('T')[0]}.json"`)
          .header('X-Record-Count', count.toString())
        return reply.send(json)
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message, timestamp: Date.now() })
      }
    }
  )
}
