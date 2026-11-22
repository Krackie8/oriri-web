import { createClient } from 'npm:@supabase/supabase-js@2'
import postgres from 'npm:postgres@3.4.5'
import { hasAdminRole, type RolesReader } from '../server/adminRole.ts'
import * as kv from '../server/kv_store.tsx'
import { createAdminApp } from './app.ts'
import { createKvLimiter } from './signInLink.ts'

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
    return { id: user.id, email: user.email ?? '' }
  },
  signInLink: {
    // Runs as the connection user in a read-only transaction: service_role cannot select auth.users.
    findUserIdByEmail: async (email) => {
      const rows = await db().begin('read only', (tx: any) =>
        tx`select id from auth.users where lower(email) = ${email}`)
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
  },
  overview: {},
  me: {},
})

Deno.serve(app.fetch)
