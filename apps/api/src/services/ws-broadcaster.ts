import type { WsEvent, WsEventType } from '@arbitex/types'

type SocketLike = {
  readyState: number
  send: (data: string) => void
}

class WsBroadcaster {
  private clients = new Set<SocketLike>()

  register(socket: SocketLike) {
    this.clients.add(socket)
  }

  unregister(socket: SocketLike) {
    this.clients.delete(socket)
  }

  broadcast<T>(type: WsEventType, payload: T) {
    const event: WsEvent<T> = { type, payload, timestamp: Date.now() }
    const message = JSON.stringify(event)

    for (const client of this.clients) {
      if (client.readyState === 1) { // OPEN
        try {
          client.send(message)
        } catch {
          this.clients.delete(client)
        }
      }
    }
  }

  get connectionCount() {
    return this.clients.size
  }
}

export const broadcaster = new WsBroadcaster()
