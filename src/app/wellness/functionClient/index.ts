/**
 * The default Function client for the browser. Screens import `functionClient`
 * from here; tests build their own with createFunctionClient and the fake transport.
 */
import { nativeFetch } from '../../utils/sameOriginFetch'
import { supabase } from '../../utils/supabase/client'
import { projectId, publicAnonKey } from '../../utils/supabase/info'
import { getAttribution, sourceLabel } from '../analytics/utm'
import { localDay } from '../bestie/state'
import { createFunctionClient } from './client'
import { createHttpTransport } from './httpTransport'
import { tokenFromSession } from './token'

export const functionClient = createFunctionClient({
  transport: createHttpTransport({
    fetch: nativeFetch,
    hostname: window.location.hostname,
    fnBase: `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`,
  }),
  getToken: tokenFromSession(supabase.auth, publicAnonKey),
  env: {
    // Looked up on each use: touching localStorage can throw when site data is blocked.
    storage: {
      getItem: (k) => window.localStorage.getItem(k),
      setItem: (k, v) => window.localStorage.setItem(k, v),
      removeItem: (k) => window.localStorage.removeItem(k),
    },
    attribution: getAttribution,
    sourceLabel,
    localDay: () => localDay(),
    pageUrl: () => window.location.href,
    now: () => new Date(),
  },
})

export { createFunctionClient } from './client'
export type { FunctionClient, FunctionClientEnv } from './client'
export type { Result, FunctionError, Transport } from './types'
export type { FreeDayClaim, ClaimOutcome } from './freeDay'
export type { JoinInput, JoinOutcome, MeOutcome, Member, ConsentPurpose } from './member'
export type { CheckInInput, CheckInOutcome, TodayOutcome, OptionsOutcome, ChangeOutcome as SuggestionChange, SwapOption, DayPlan as ServerDayPlan, Suggestion as ServerSuggestion } from './bestie'
export type { CompleteOutcome, UndoOutcome, PhotoOutcome, JournalEntry, JournalOutcome, RefusalReason, Progress, Profile, ProfileOutcome, StatusView, PillarNumbers, Tier } from './bestie'
