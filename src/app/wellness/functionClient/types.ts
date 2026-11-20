/**
 * The Function client's shared shapes. See GLOSSARY.md: Function client, Relay.
 */

/** Every action returns one of these and never throws. */
export type Result<T> = { ok: true; data: T } | { ok: false; error: FunctionError }

export interface FunctionError {
  /** HTTP status, or 0 when the edge function could not be reached. */
  status: number
  message: string
  /** The server's JSON reply, when there was one. */
  details?: unknown
}

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** What goes into the transport seam. */
export interface TransportRequest {
  method: Method
  /** Path under the edge function, starting with '/', e.g. '/bestie/free-day'. */
  path: string
  body?: unknown
  form?: FormData
  /** A binary body sent as-is with its own type (a photo). */
  blob?: Blob
  /** Bearer token: the signed-in user's, or the anon key. */
  token: string
}

/** What comes out: the status and the parsed JSON (null when the reply isn't JSON). */
export interface TransportResponse {
  status: number
  json: unknown
}

/**
 * The seam between the Function client and the network. Adapters:
 * HTTP + Relay (httpTransport.ts) and an in-memory fake (fakeTransport.ts).
 * `send` rejects only when the edge function can't be reached at all.
 */
export interface Transport {
  send(req: TransportRequest): Promise<TransportResponse>
}
