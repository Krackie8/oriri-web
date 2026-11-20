/**
 * What the Day screen says about Completing with Proof (#72). Members are in Dubai, so times are
 * shown on the Dubai clock.
 */
const DUBAI_TIME = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', hour: 'numeric', minute: '2-digit', hour12: true })

/** "Ready at 9:45 am" while the time gate is closed; null once it is open or unknown. */
export function readyLabel(readyAt: string | undefined, now: Date): string | null {
  if (!readyAt) return null
  const at = new Date(readyAt)
  if (Number.isNaN(at.getTime()) || at <= now) return null
  return `Ready at ${DUBAI_TIME.format(at).replace(/\s+/g, ' ').toLowerCase()}`
}
