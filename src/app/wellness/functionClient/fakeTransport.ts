/**
 * In-memory adapter for tests: route handlers act like the edge function, and
 * every request that reached it is recorded in `calls`.
 * A handler returns a response, or 'unreachable' to simulate a network failure.
 */
import type { Transport, TransportRequest, TransportResponse } from './types'

export type FakeHandler = (req: TransportRequest) => TransportResponse | 'unreachable'

export function createFakeTransport(routes: Record<string, FakeHandler>): Transport & { calls: TransportRequest[] } {
  const calls: TransportRequest[] = []
  return {
    calls,
    async send(req) {
      const handler = routes[`${req.method} ${req.path}`]
      const res = handler ? handler(req) : { status: 404, json: { success: false, error: `No route ${req.method} ${req.path}` } }
      if (res === 'unreachable') throw new TypeError('Failed to fetch')
      calls.push(req)
      return res
    },
  }
}
