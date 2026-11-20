/**
 * The part every domain action shares: picks the token, calls the transport,
 * and turns whatever happens into a Result. It never throws.
 */
import type { Method, Result, Transport } from './types'

export type GetToken = () => Promise<string>

export interface Core {
  request<T = unknown>(method: Method, path: string, opts?: { body?: unknown; form?: FormData; blob?: Blob }): Promise<Result<T>>
}

const UNREACHABLE = 'Could not reach Oriri. Check your connection.'

export function createCore(transport: Transport, getToken: GetToken): Core {
  return {
    async request<T>(method: Method, path: string, opts: { body?: unknown; form?: FormData; blob?: Blob } = {}): Promise<Result<T>> {
      let res
      try {
        res = await transport.send({ method, path, body: opts.body, form: opts.form, ...(opts.blob ? { blob: opts.blob } : {}), token: await getToken() })
      } catch {
        return { ok: false, error: { status: 0, message: UNREACHABLE } }
      }
      const json = res.json as { success?: boolean; error?: unknown } | null
      // A 2xx without JSON is not the edge function answering (e.g. an HTML page), so it is not a success.
      const ok = res.status >= 200 && res.status < 300 && json !== null && json.success !== false
      if (ok) return { ok: true, data: json as T }
      const message = typeof json?.error === 'string' && json.error ? json.error : `Request failed (${res.status})`
      return { ok: false, error: { status: res.status, message, details: json } }
    },
  }
}
