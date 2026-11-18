/**
 * The wording a Member agrees to when she Joins. One version for the whole set:
 * if any line here changes, change CONSENT_VERSION in supabase/functions/server/join.ts too.
 * Draft for Khairul and Ren to approve.
 */
import type { ConsentPurpose } from '../functionClient'

export interface ConsentLine {
  purpose: ConsentPurpose
  required: boolean
  label: string
}

export const CONSENT_LINES: ConsentLine[] = [
  { purpose: 'terms', required: true, label: 'I agree to Oriri’s terms and privacy notice, including that my data is stored outside the UAE.' },
  { purpose: 'location', required: false, label: 'Use my location while I’m using Oriri, to suggest things near me. Only the area is kept, never where exactly I am.' },
  { purpose: 'wellness_signals', required: false, label: 'Keep my Check-ins (energy, time, budget, goal) so Bestie can plan my day.' },
  { purpose: 'personalisation', required: false, label: 'Let Bestie learn from what I accept, skip and complete, to suggest things I’ll love.' },
  { purpose: 'push', required: false, label: 'Send me morning and evening reminders, at times I choose.' },
  { purpose: 'marketing', required: false, label: 'Email me news, events and offers from Oriri. Unsubscribe any time.' },
]
