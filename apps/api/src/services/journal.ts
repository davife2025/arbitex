import { supabaseAdmin } from './supabase'

export interface JournalEntry {
  id: string
  user_id: string
  title: string
  body: string | null
  mood: 'confident' | 'uncertain' | 'fearful' | 'greedy' | 'neutral'
  tags: string[]
  linked_signal_id: string | null
  linked_order_id: string | null
  linked_paper_position_id: string | null
  pnl_usdt: number | null
  pnl_pct: number | null
  lessons_learned: string | null
  mistakes: string | null
  created_at: string
  updated_at: string
}

export interface JournalStats {
  total_entries: number
  by_mood: Record<string, number>
  by_tag: Record<string, number>
  avg_pnl_pct: number
  best_entry: JournalEntry | null
  worst_entry: JournalEntry | null
  streak: number  // consecutive profitable days journaled
}

export class JournalService {

  async list(userId: string, filters?: {
    mood?: string
    tag?: string
    from?: string
    to?: string
    limit?: number
    offset?: number
  }): Promise<JournalEntry[]> {
    let query = supabaseAdmin
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(filters?.limit ?? 50)

    if (filters?.mood)   query = query.eq('mood', filters.mood)
    if (filters?.tag)    query = query.contains('tags', [filters.tag])
    if (filters?.from)   query = query.gte('created_at', filters.from)
    if (filters?.to)     query = query.lte('created_at', filters.to)
    if (filters?.offset) query = query.range(filters.offset, (filters.offset + (filters.limit ?? 50)) - 1)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []) as JournalEntry[]
  }

  async get(userId: string, id: string): Promise<JournalEntry | null> {
    const { data, error } = await supabaseAdmin
      .from('journal_entries')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    if (error) return null
    return data as JournalEntry
  }

  async create(userId: string, params: Partial<JournalEntry>): Promise<JournalEntry> {
    const { data, error } = await supabaseAdmin
      .from('journal_entries')
      .insert({ user_id: userId, ...params })
      .select().single()
    if (error) throw new Error(error.message)
    return data as JournalEntry
  }

  async update(userId: string, id: string, params: Partial<JournalEntry>): Promise<JournalEntry> {
    const { data, error } = await supabaseAdmin
      .from('journal_entries')
      .update(params)
      .eq('id', id)
      .eq('user_id', userId)
      .select().single()
    if (error) throw new Error(error.message)
    return data as JournalEntry
  }

  async delete(userId: string, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('journal_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
  }

  async getStats(userId: string): Promise<JournalStats> {
    const { data: entries } = await supabaseAdmin
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)

    const all = (entries ?? []) as JournalEntry[]

    // By mood
    const byMood: Record<string, number> = {}
    for (const e of all) {
      byMood[e.mood] = (byMood[e.mood] ?? 0) + 1
    }

    // By tag
    const byTag: Record<string, number> = {}
    for (const e of all) {
      for (const tag of e.tags ?? []) {
        byTag[tag] = (byTag[tag] ?? 0) + 1
      }
    }

    // PnL stats (entries with pnl)
    const withPnl = all.filter(e => e.pnl_pct != null)
    const avgPnl = withPnl.length > 0
      ? withPnl.reduce((s, e) => s + (e.pnl_pct ?? 0), 0) / withPnl.length
      : 0

    const sorted = [...withPnl].sort((a, b) => (b.pnl_pct ?? 0) - (a.pnl_pct ?? 0))
    const best = sorted[0] ?? null
    const worst = sorted[sorted.length - 1] ?? null

    return {
      total_entries: all.length,
      by_mood: byMood,
      by_tag: byTag,
      avg_pnl_pct: parseFloat(avgPnl.toFixed(4)),
      best_entry: best,
      worst_entry: worst,
      streak: 0, // TODO: compute journaling streak
    }
  }

  async getAllTags(userId: string): Promise<string[]> {
    const { data } = await supabaseAdmin
      .from('journal_entries')
      .select('tags')
      .eq('user_id', userId)

    const tagSet = new Set<string>()
    for (const row of data ?? []) {
      for (const tag of row.tags ?? []) tagSet.add(tag)
    }
    return Array.from(tagSet).sort()
  }
}

export const journalService = new JournalService()
