// Fresh sign-in check. Pure and Deno-free (vitest imports it under Node).
export const FRESH_MS = 600_000
const FUTURE_SKEW_MS = 60_000

// The newest amr[].timestamp (Unix seconds -> ms) whose method is not 'token_refresh'.
// Order is not relied on; malformed entries are ignored.
export function signedInAt(claims: unknown): number | null {
  if (!claims || typeof claims !== 'object') return null
  const amr = (claims as { amr?: unknown }).amr
  if (!Array.isArray(amr)) return null
  let newest: number | null = null
  for (const entry of amr) {
    if (!entry || typeof entry !== 'object') continue
    const { method, timestamp } = entry as { method?: unknown; timestamp?: unknown }
    if (method === 'token_refresh') continue
    if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) continue
    const ms = timestamp * 1000
    if (newest === null || ms > newest) newest = ms
  }
  return newest
}

export function isFresh(signedInAtMs: number | null, nowMs: number): boolean {
  if (signedInAtMs === null) return false
  const age = nowMs - signedInAtMs
  if (age < 0) return age >= -FUTURE_SKEW_MS
  return age <= FRESH_MS
}

// Decodes a JWT's payload (middle segment, base64url JSON). Null on any error.
// Does NOT verify the token: call only after the token was verified elsewhere.
export function decodePayload(token: string): unknown {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')))
  } catch {
    return null
  }
}
