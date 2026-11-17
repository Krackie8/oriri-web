/**
 * Where a Member lands once she is signed in or has just joined. Her Day plan lives on the server
 * (ADR-0003), so a plan made today on another device, or before her browser data was cleared, still
 * counts. Answers saved in this browser are the fallback. Never a path taken from the URL.
 */
import type { Result } from '../functionClient'
import type { TodayOutcome } from '../functionClient'

export async function afterJoin(today: () => Promise<Result<TodayOutcome>>, hasSavedInputs: () => boolean): Promise<'/plan/day' | '/plan/inputs'> {
  const r = await today().catch(() => null)
  if (r?.ok && r.data.outcome === 'planned') return '/plan/day'
  return hasSavedInputs() ? '/plan/day' : '/plan/inputs'
}
