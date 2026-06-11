import { supabaseAdmin } from './supabase'

export type ExportType = 'journal_csv' | 'performance_csv' | 'signals_csv' | 'full_json'

function escapeCSV(val: any): string {
  if (val == null) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCSV(rows: Record<string, any>[], headers: string[]): string {
  const headerRow = headers.map(escapeCSV).join(',')
  const dataRows = rows.map(row =>
    headers.map(h => escapeCSV(row[h])).join(',')
  )
  return [headerRow, ...dataRows].join('\n')
}

export class DataExportService {

  async exportJournalCSV(userId: string): Promise<{ csv: string; count: number }> {
    const { data, error } = await supabaseAdmin
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    const rows = data ?? []

    const headers = [
      'created_at','title','mood','tags','pnl_pct','pnl_usdt',
      'body','lessons_learned','mistakes',
    ]

    const csv = toCSV(
      rows.map(r => ({ ...r, tags: (r.tags ?? []).join(';') })),
      headers
    )

    await this.logExport(userId, 'journal_csv', rows.length)
    return { csv, count: rows.length }
  }

  async exportPerformanceCSV(userId: string): Promise<{ csv: string; count: number }> {
    const { data, error } = await supabaseAdmin
      .from('signal_outcomes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    const rows = data ?? []

    const headers = [
      'created_at','symbol','direction','confidence',
      'entry_price','exit_price','target_price','stop_loss',
      'outcome','pnl_pct','pnl_usdt','risk_reward_ratio',
      'bars_held','model_used','resolved_at',
    ]

    const csv = toCSV(rows, headers)
    await this.logExport(userId, 'performance_csv', rows.length)
    return { csv, count: rows.length }
  }

  async exportSignalsCSV(userId: string): Promise<{ csv: string; count: number }> {
    const { data, error } = await supabaseAdmin
      .from('ai_signals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    const rows = data ?? []

    const headers = [
      'created_at','symbol','direction','confidence',
      'entry_price','target_price','stop_loss',
      'status','model_used','reasoning','expires_at',
    ]

    const csv = toCSV(rows, headers)
    await this.logExport(userId, 'signals_csv', rows.length)
    return { csv, count: rows.length }
  }

  async exportFullJSON(userId: string): Promise<{ json: string; count: number }> {
    const [journal, signals, outcomes, paperTrades, paperPositions, alertLog] =
      await Promise.all([
        supabaseAdmin.from('journal_entries').select('*').eq('user_id', userId),
        supabaseAdmin.from('ai_signals').select('*').eq('user_id', userId),
        supabaseAdmin.from('signal_outcomes').select('*').eq('user_id', userId),
        supabaseAdmin.from('paper_trades').select('*').eq('user_id', userId),
        supabaseAdmin.from('paper_positions').select('*').eq('user_id', userId),
        supabaseAdmin.from('alert_log').select('*').eq('user_id', userId),
      ])

    const payload = {
      exported_at: new Date().toISOString(),
      user_id: userId,
      journal_entries: journal.data ?? [],
      signals: signals.data ?? [],
      signal_outcomes: outcomes.data ?? [],
      paper_trades: paperTrades.data ?? [],
      paper_positions: paperPositions.data ?? [],
      alert_log: alertLog.data ?? [],
    }

    const totalRecords =
      (journal.data?.length ?? 0) +
      (signals.data?.length ?? 0) +
      (outcomes.data?.length ?? 0) +
      (paperTrades.data?.length ?? 0)

    await this.logExport(userId, 'full_json', totalRecords)
    return { json: JSON.stringify(payload, null, 2), count: totalRecords }
  }

  private async logExport(userId: string, exportType: ExportType, count: number) {
    await supabaseAdmin.from('export_log').insert({
      user_id: userId,
      export_type: exportType,
      record_count: count,
    })
  }
}

export const dataExportService = new DataExportService()
