import { createClient } from 'npm:@supabase/supabase-js@2'
import postgres from 'npm:postgres@3.4.5'
import { hasAdminRole, adminUserIds, type RolesReader } from '../server/adminRole.ts'
import * as kv from '../server/kv_store.tsx'
import { createAdminApp } from './app.ts'
import { signedInAt, decodePayload } from './fresh.ts'
import { createKvLimiter } from './signInLink.ts'
import { OVERVIEW_SQL } from './overviewQuery.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// Same SMTP settings and sender as the Member function `server`.
const SMTP = {
  host: Deno.env.get('SMTP_HOST') || 'mail.oriri.me',
  port: Number(Deno.env.get('SMTP_PORT') || 465),
  user: Deno.env.get('SMTP_USER') || 'account@oriri.me',
  from: 'Oriri <account@oriri.me>',
}

async function sendMail(to: string, subject: string, text: string, html: string) {
  const pass = Deno.env.get('SMTP_PASS')
  if (!pass) throw new Error('SMTP_PASS not set')
  const { SMTPClient } = await import('https://deno.land/x/denomailer@1.6.0/mod.ts')
  const client = new SMTPClient({
    connection: { hostname: SMTP.host, port: SMTP.port, tls: SMTP.port === 465, auth: { username: SMTP.user, password: pass } },
  })
  try {
    await client.send({ from: SMTP.from, to, subject, content: text, html })
  } finally {
    await client.close()
  }
}

let sqlClient: ReturnType<typeof postgres> | null = null
const db = () => (sqlClient ??= postgres(Deno.env.get('SUPABASE_DB_URL')!, { max: 2, prepare: false }))

const app = createAdminApp({
  // Admin = a live admin row in public.user_roles, read as service_role (adminRole.ts).
  isAdmin: (id) => hasAdminRole(supabase as unknown as RolesReader, id),
  userFromToken: async (token) => {
    if (!token) return null
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return null
    // These claims are trusted only because getUser verified the token first.
    return { id: user.id, email: user.email ?? '', signedInAt: signedInAt(decodePayload(token)) }
  },
  signInLink: {
    // Runs as the connection user in a read-only transaction: service_role cannot select auth.users.
    findUserIdByEmail: async (email) => {
      const rows = await db().begin('read only', (tx: any) =>
        tx`select id from auth.users where lower(email) = ${email} and deleted_at is null limit 1`)
      return (rows[0] as { id: string } | undefined)?.id ?? null
    },
    isAdmin: (id) => hasAdminRole(supabase as unknown as RolesReader, id),
    // Only called once the account is known to exist, so this never creates a user.
    makeLink: async (email, redirectTo) => {
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo },
      })
      if (error || !data?.properties?.action_link) throw new Error('generateLink failed')
      return data.properties.action_link
    },
    sendMail,
    limiter: createKvLimiter(kv),
    redirectTo: 'https://www.oriri.me/admin', // replaced per request by the route
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    background: (p) => {
      const rt = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime
      if (rt) rt.waitUntil(p)
      else p.catch(() => {})
    },
  },
  overview: {
    kv,
    adminIds: async () => [...(await adminUserIds(supabase as unknown as Parameters<typeof adminUserIds>[0]))],
    // Runs as the connection user in a read-only transaction: service_role cannot select auth.users.
    queryRow: async (ids, emails) => {
      const rows = await db().begin('read only', (tx: any) => tx.unsafe(OVERVIEW_SQL, [ids, emails]))
      return rows[0] as Record<string, unknown> | undefined
    },
  },
  me: {
    displayName: async (id) => {
      try {
        // user_id is the auth-user link; profiles.id is not the auth user id.
        const { data, error } = await supabase.from('profiles').select('display_name').eq('user_id', id).maybeSingle()
        if (error) {
          console.error('admin/me: display name lookup failed')
          return null
        }
        return (data as { display_name?: string | null } | null)?.display_name ?? null
      } catch {
        console.error('admin/me: display name lookup failed')
        return null
      }
    },
  },
})

Deno.serve(app.fetch)
