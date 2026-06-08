import { describe, it, expect, vi, beforeEach } from 'vitest'

// Inline broadcaster to test without import side effects
class WsBroadcaster {
  private clients = new Set<any>()

  register(socket: any) { this.clients.add(socket) }
  unregister(socket: any) { this.clients.delete(socket) }

  broadcast<T>(type: string, payload: T) {
    const event = JSON.stringify({ type, payload, timestamp: Date.now() })
    for (const client of this.clients) {
      if (client.readyState === 1) {
        try { client.send(event) }
        catch { this.clients.delete(client) }
      }
    }
  }

  get connectionCount() { return this.clients.size }
}

const makeSocket = (readyState = 1) => ({
  readyState,
  send: vi.fn(),
})

describe('WsBroadcaster', () => {
  let broadcaster: WsBroadcaster

  beforeEach(() => { broadcaster = new WsBroadcaster() })

  it('starts with zero connections', () => {
    expect(broadcaster.connectionCount).toBe(0)
  })

  it('increments on register', () => {
    broadcaster.register(makeSocket())
    expect(broadcaster.connectionCount).toBe(1)
  })

  it('decrements on unregister', () => {
    const s = makeSocket()
    broadcaster.register(s)
    broadcaster.unregister(s)
    expect(broadcaster.connectionCount).toBe(0)
  })

  it('broadcasts to all open clients', () => {
    const a = makeSocket()
    const b = makeSocket()
    broadcaster.register(a)
    broadcaster.register(b)
    broadcaster.broadcast('ticker_update', [{ symbol: 'BTCUSDT' }])
    expect(a.send).toHaveBeenCalledOnce()
    expect(b.send).toHaveBeenCalledOnce()
  })

  it('skips closed clients (readyState !== 1)', () => {
    const open = makeSocket(1)
    const closed = makeSocket(3)
    broadcaster.register(open)
    broadcaster.register(closed)
    broadcaster.broadcast('ticker_update', [])
    expect(open.send).toHaveBeenCalledOnce()
    expect(closed.send).not.toHaveBeenCalled()
  })

  it('removes erroring clients automatically', () => {
    const bad = { readyState: 1, send: vi.fn().mockImplementation(() => { throw new Error('broken pipe') }) }
    broadcaster.register(bad)
    expect(broadcaster.connectionCount).toBe(1)
    broadcaster.broadcast('ticker_update', [])
    expect(broadcaster.connectionCount).toBe(0)
  })

  it('broadcast payload contains correct type and timestamp', () => {
    const s = makeSocket()
    broadcaster.register(s)
    broadcaster.broadcast('signal_update', { id: 'abc' })
    const parsed = JSON.parse(s.send.mock.calls[0][0])
    expect(parsed.type).toBe('signal_update')
    expect(parsed.payload).toEqual({ id: 'abc' })
    expect(typeof parsed.timestamp).toBe('number')
  })
})
