import { supabaseAdmin } from './supabase'
import { broadcaster } from './ws-broadcaster'

export type NotificationType =
  | 'signal_generated' | 'signal_triggered' | 'signal_expired'
  | 'stop_hit' | 'target_hit' | 'price_alert'
  | 'circuit_breaker' | 'strategy_triggered'
  | 'commentary_updated' | 'system'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  icon: string
  read: boolean
  action_url: string | null
  metadata: Record<string, any>
  created_at: string
}

const typeConfig: Record<NotificationType, { icon: string; default_title: string }> = {
  signal_generated:   { icon: '◈', default_title: 'New AI Signal' },
  signal_triggered:   { icon: '⚡', default_title: 'Signal Triggered' },
  signal_expired:     { icon: '⏱', default_title: 'Signal Expired' },
  stop_hit:           { icon: '🛑', default_title: 'Stop Loss Hit' },
  target_hit:         { icon: '🎯', default_title: 'Target Reached' },
  price_alert:        { icon: '🔔', default_title: 'Price Alert' },
  circuit_breaker:    { icon: '⚠', default_title: 'Circuit Breaker Active' },
  strategy_triggered: { icon: '⚙', default_title: 'Strategy Triggered' },
  commentary_updated: { icon: '📰', default_title: 'Market Brief Updated' },
  system:             { icon: 'ℹ', default_title: 'System Notice' },
}

export class NotificationService {

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body?: string,
    options?: {
      actionUrl?: string
      metadata?: Record<string, any>
    }
  ): Promise<Notification> {
    const cfg = typeConfig[type]

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title: title || cfg.default_title,
        body: body ?? null,
        icon: cfg.icon,
        read: false,
        action_url: options?.actionUrl ?? null,
        metadata: options?.metadata ?? {},
      })
      .select().single()

    if (error) throw new Error(error.message)

    // Push to WS
    broadcaster.broadcast('signal_update', {
      type: 'notification',
      notification: data,
    })

    return data as Notification
  }

  async list(userId: string, options?: {
    unreadOnly?: boolean
    limit?: number
    type?: NotificationType
  }): Promise<Notification[]> {
    let query = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(options?.limit ?? 50)

    if (options?.unreadOnly) query = query.eq('read', false)
    if (options?.type)       query = query.eq('type', options.type)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []) as Notification[]
  }

  async markRead(userId: string, ids: string[]): Promise<void> {
    await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .in('id', ids)
  }

  async markAllRead(userId: string): Promise<void> {
    await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
  }

  async delete(userId: string, id: string): Promise<void> {
    await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { count } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)
    return count ?? 0
  }

  // Convenience: create notification + fire alert
  async notify(userId: string, type: NotificationType, title: string, body?: string, metadata?: Record<string, any>) {
    try {
      await this.create(userId, type, title, body, { metadata })
    } catch (err) {
      console.error(`Notification error (${type}):`, err)
    }
  }
}

export const notificationService = new NotificationService()
