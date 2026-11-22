/** The default Admin client for the browser, built like index.ts but for the `admin` function. */
import { nativeFetch } from '../../utils/sameOriginFetch'
import { supabase } from '../../utils/supabase/client'
import { projectId, publicAnonKey } from '../../utils/supabase/info'
import { createAdminClient } from './admin'
import { createCore } from './core'
import { createHttpTransport } from './httpTransport'
import { tokenFromSession } from './token'

export const adminClient = createAdminClient(
  createCore(
    createHttpTransport({
      fetch: nativeFetch,
      hostname: window.location.hostname,
      fnBase: `https://${projectId}.supabase.co/functions/v1/admin`,
      relay: '/api/admin',
    }),
    tokenFromSession(supabase.auth, publicAnonKey),
  ),
)
