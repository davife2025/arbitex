import { supabaseAdmin } from './supabase'

export interface RequestLog {
  endpoint: string
  method: string
  status_code?: number
  response_time_ms?: number
  error?: string
}

export interface RateLimitStats {
  total_requests: number
  requests_last_hour: number
  requests_last_minute: number
  avg_response_ms: number
  error_rate_pct: number
  by_endpoint: EndpointStats[]
  timeline: TimelinePoint[]
}

export interface EndpointStats {
  endpoint: string
  count: number
  avg_ms: number
  error_count: number
  error_rate_pct: number
  last_called: string
}

export interface TimelinePoint {
  minute: string
  count: number
  errors: number
}

// Bitget rate limit constants
const BITGET_LIMITS = {
  PUBLIC_PER_SECOND: 20,
  PRIVATE_PER_SECOND: 10,
  DAILY_LIMIT: 86400,
}

class RateLimitTracker {
  // In-memory rolling window (avoid DB for every request)
  private recentRequests: Array<{ ts: number; endpoint: string; ms: number; error: boolean }> = []
  private readonly MAX_IN_MEMORY = 500

  track(log: RequestLog & { responseTimeMs?: number }) {
    const entry = {
      ts: Date.now(),
      endpoint: log.endpoint,
      ms: log.response_time_ms ?? 0,
      error: (log.status_code ?? 200) >= 400 || !!log.error,
    }

    this.recentRequests.push(entry)

    // Keep rolling window trimmed
    if (this.recentRequests.length > this.MAX_IN_MEMORY) {
      this.recentRequests = this.recentRequests.slice(-this.MAX_IN_MEMORY)
    }

    // Async persist to DB (fire-and-forget)
    supabaseAdmin.from('api_request_log').insert({
      endpoint: log.endpoint,
      method: log.method,
      status_code: log.status_code ?? 200,
      response_time_ms: log.response_time_ms ?? 0,
      error: log.error ?? null,
    }).then(() => {}).catch(() => {})
  }

  getStats(): RateLimitStats {
    const now = Date.now()
    const lastHour = this.recentRequests.filter(r => now - r.ts < 3600000)
    const lastMinute = this.recentRequests.filter(r => now - r.ts < 60000)

    const totalMs = lastHour.reduce((s, r) => s + r.ms, 0)
    const avgMs = lastHour.length > 0 ? totalMs / lastHour.length : 0
    const errorCount = lastHour.filter(r => r.error).length
    const errorRate = lastHour.length > 0 ? (errorCount / lastHour.length) * 100 : 0

    // By endpoint
    const endpointMap = new Map<string, { count: number; ms: number; errors: number; last: number }>()
    for (const r of lastHour) {
      const cur = endpointMap.get(r.endpoint) ?? { count: 0, ms: 0, errors: 0, last: 0 }
      endpointMap.set(r.endpoint, {
        count: cur.count + 1,
        ms: cur.ms + r.ms,
        errors: cur.errors + (r.error ? 1 : 0),
        last: Math.max(cur.last, r.ts),
      })
    }

    const byEndpoint: EndpointStats[] = Array.from(endpointMap.entries())
      .map(([endpoint, s]) => ({
        endpoint,
        count: s.count,
        avg_ms: Math.round(s.ms / s.count),
        error_count: s.errors,
        error_rate_pct: parseFloat(((s.errors / s.count) * 100).toFixed(2)),
        last_called: new Date(s.last).toISOString(),
      }))
      .sort((a, b) => b.count - a.count)

    // Timeline — last 30 minutes by minute
    const timeline: TimelinePoint[] = Array.from({ length: 30 }, (_, i) => {
      const minuteStart = now - (30 - i) * 60000
      const minuteEnd = minuteStart + 60000
      const inMinute = this.recentRequests.filter(r => r.ts >= minuteStart && r.ts < minuteEnd)
      return {
        minute: new Date(minuteStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        count: inMinute.length,
        errors: inMinute.filter(r => r.error).length,
      }
    })

    return {
      total_requests: this.recentRequests.length,
      requests_last_hour: lastHour.length,
      requests_last_minute: lastMinute.length,
      avg_response_ms: Math.round(avgMs),
      error_rate_pct: parseFloat(errorRate.toFixed(2)),
      by_endpoint: byEndpoint,
      timeline,
    }
  }

  getBitgetQuotaStatus() {
    const lastMinute = this.recentRequests.filter(
      r => Date.now() - r.ts < 60000 && r.endpoint.includes('bitget')
    ).length

    return {
      public_limit_per_second: BITGET_LIMITS.PUBLIC_PER_SECOND,
      private_limit_per_second: BITGET_LIMITS.PRIVATE_PER_SECOND,
      requests_last_minute: lastMinute,
      estimated_per_second: parseFloat((lastMinute / 60).toFixed(2)),
      warning: lastMinute / 60 > BITGET_LIMITS.PRIVATE_PER_SECOND * 0.8,
    }
  }
}

export const rateLimitTracker = new RateLimitTracker()
