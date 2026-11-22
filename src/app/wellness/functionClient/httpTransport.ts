/**
 * HTTP + Relay adapter. Same rules as the Legacy app's global fetch patch
 * (utils/sameOriginFetch.ts), without depending on it:
 * - The Relay (/api/fn/*) is used only on oriri.me and its subdomains.
 * - An HTML 404 (Relay not deployed) or a 500 marks the Relay broken for the
 *   rest of the visit: every later call goes direct.
 * - A 502 (Relay couldn't reach Supabase) or a network error sends only that
 *   call direct.
 * - GET goes out without Content-Type, so the preflight stays small.
 */
import type { Transport, TransportRequest, TransportResponse } from './types'

const DEFAULT_RELAY = '/api/fn'
const ORIRI_HOST = /(^|\.)oriri\.me$/i

export interface HttpTransportOptions {
  /** Must be the browser's own fetch, not the Legacy app's patched one. */
  fetch: typeof globalThis.fetch
  hostname: string
  /** Edge function base URL, without a trailing slash. */
  fnBase: string
  /** Same-origin Relay prefix. Defaults to '/api/fn'. */
  relay?: string
}

export function createHttpTransport({ fetch, hostname, fnBase, relay = DEFAULT_RELAY }: HttpTransportOptions): Transport {
  let relayBroken = !ORIRI_HOST.test(hostname)

  const call = async (base: string, req: TransportRequest): Promise<Response> => {
    const headers: Record<string, string> = {}
    let body: BodyInit | undefined
    if (req.form) body = req.form
    else if (req.blob) {
      headers['Content-Type'] = req.blob.type || 'application/octet-stream'
      body = req.blob
    } else if (req.body !== undefined && req.method !== 'GET') {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(req.body)
    }
    headers.Authorization = `Bearer ${req.token}`
    return fetch(`${base}${req.path}`, { method: req.method, headers, body })
  }

  const read = async (res: Response): Promise<TransportResponse> => ({
    status: res.status,
    json: (res.headers.get('content-type') || '').includes('json') ? await res.json().catch(() => null) : null,
  })

  return {
    async send(req) {
      if (relayBroken) return read(await call(fnBase, req))
      let res: Response
      try {
        res = await call(relay, req)
      } catch {
        return read(await call(fnBase, req))
      }
      const html = (res.headers.get('content-type') || '').includes('text/html')
      if ((res.status === 404 && html) || res.status === 500) {
        relayBroken = true
        return read(await call(fnBase, req))
      }
      if (res.status === 502) return read(await call(fnBase, req))
      return read(res)
    },
  }
}
