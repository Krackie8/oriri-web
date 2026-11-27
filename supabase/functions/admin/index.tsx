import { createClient } from 'npm:@supabase/supabase-js@2'
import postgres from 'npm:postgres@3.4.5'
import { hasAdminRole, adminUserIds, type RolesReader } from '../server/adminRole.ts'
import * as kv from '../server/kv_store.tsx'
import { createAdminApp } from './app.ts'
import { signedInAt, decodePayload } from './fresh.ts'
import { createKvLimiter } from './signInLink.ts'
import { OVERVIEW_SQL } from './overviewQuery.ts'
import { testEmailsFrom } from './overview.ts'
import { MEMBERS_LIST_SQL, MEMBER_DETAIL_SQL } from './membersQuery.ts'
import { TEAM_LIST_SQL, TEAM_GRANT_SQL, TEAM_REMOVE_SQL, TEAM_CHANGES_SQL } from './teamQuery.ts'
import { PLACE_SQL, ACTIVITY_SQL, EVENT_SQL, CONTENT_SQL, UNDO_SQL, placeParams, activityParams, eventParams, contentParams, undoParams, decideResultFrom, undoFromJson } from './catalogueQuery.ts'
import type { EventKind, StoredEvent } from './events.ts'

const WELLNESS_BUCKET = 'make-a278ea32-wellness'
const EVENT_PREFIX: Record<EventKind, string> = { moment: 'wellness:moment:', event: 'wellness:event:' }

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
/** Keeps work running after the answer is sent when the runtime allows it. */
const background = (p: Promise<unknown>): void => {
  const rt = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime
  if (rt) rt.waitUntil(p)
  else p.catch(() => {})
}

const db = () => (sqlClient ??= postgres(Deno.env.get('SUPABASE_DB_URL')!, { max: 2, prepare: false }))

// Runs as the connection user in a read-only transaction: service_role cannot select auth.users.
const findUserIdByEmail = async (email: string): Promise<string | null> => {
  const rows = await db().begin('read only', (tx: any) =>
    tx`select id from auth.users where lower(email) = ${email} and deleted_at is null limit 1`)
  return (rows[0] as { id: string } | undefined)?.id ?? null
}

// Team writes: public.user_roles and bestie.team_changes, as service_role, in one transaction.
// The statements never read auth.users (service_role can't); the email is passed in.
const asServiceRole = (sql: string, params: unknown[]) =>
  db().begin(async (tx: any) => {
    await tx`set local role service_role`
    return tx.unsafe(sql, params)
  })

const adminIds = async () => [...(await adminUserIds(supabase as unknown as Parameters<typeof adminUserIds>[0]))]

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
    findUserIdByEmail,
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
    background,
  },
  overview: {
    kv,
    adminIds,
    // Runs as the connection user in a read-only transaction: service_role cannot select auth.users.
    queryRow: async (ids, emails) => {
      const rows = await db().begin('read only', (tx: any) => tx.unsafe(OVERVIEW_SQL, [ids, emails]))
      return rows[0] as Record<string, unknown> | undefined
    },
  },
  members: {
    // Both run as the connection user in a read-only transaction: service_role cannot select auth.users.
    list: async (q) => await db().begin('read only', (tx: any) => tx.unsafe(MEMBERS_LIST_SQL, [q])) as Record<string, unknown>[],
    detail: async (id) => {
      const rows = await db().begin('read only', (tx: any) => tx.unsafe(MEMBER_DETAIL_SQL, [id]))
      return rows[0] as Record<string, unknown> | undefined
    },
    adminIds,
    testEmails: () => testEmailsFrom(kv),
  },
  team: {
    // Both reads run as the connection user in a read-only transaction: service_role cannot select auth.users.
    list: async () => await db().begin('read only', (tx: any) => tx.unsafe(TEAM_LIST_SQL)) as Record<string, unknown>[],
    changes: async () => await db().begin('read only', (tx: any) => tx.unsafe(TEAM_CHANGES_SQL)) as Record<string, unknown>[],
    findUserIdByEmail,
    // Only called once findUserIdByEmail found no account. A plain sign-in account: email confirmed, no password.
    createAccount: async (email) => {
      const { data, error } = await supabase.auth.admin.createUser({ email, email_confirm: true })
      if (error || !data?.user?.id) throw new Error('createUser failed')
      return data.user.id
    },
    grant: async (actorId, targetId, targetEmail) => {
      const rows = await asServiceRole(TEAM_GRANT_SQL, [actorId, targetId, targetEmail])
      const result = (rows[0] as { result?: unknown } | undefined)?.result
      if (result !== 'granted' && result !== 'notActor') throw new Error('grant gave no result')
      return result
    },
    remove: async (actorId, targetId, targetEmail) => {
      const rows = await asServiceRole(TEAM_REMOVE_SQL, [actorId, targetId, targetEmail])
      const result = (rows[0] as { result?: unknown } | undefined)?.result
      if (result !== 'removed' && result !== 'last' && result !== 'notAdmin' && result !== 'notActor') {
        throw new Error('remove gave no result')
      }
      return result
    },
    sendMail,
    background,
  },
  // Events (#100 piece 3, DEC-020): the same KV entries the Member side reads; no server change.
  events: {
    list: async (kind) =>
      (((await kv.getByPrefix(EVENT_PREFIX[kind])) || []) as unknown[])
        .filter((e): e is StoredEvent => !!e && typeof e === 'object' && typeof (e as { id?: unknown }).id === 'string'),
    get: async (kind, id) => ((await kv.get(EVENT_PREFIX[kind] + id)) as StoredEvent | null) ?? null,
    put: (kind, e) => kv.set(EVENT_PREFIX[kind] + e.id, e),
    remove: (kind, id) => kv.del(EVENT_PREFIX[kind] + id),
    rsvps: async (prefix) => ((await kv.getByPrefix(prefix)) || []) as unknown[],
    removeRsvps: (keys) => kv.mdel(keys),
    // The bucket exists already (Legacy made it); admin never creates buckets.
    upload: async (bytes, type) => {
      const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg'
      const path = `admin/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
      const { error } = await supabase.storage.from(WELLNESS_BUCKET).upload(path, bytes, { contentType: type })
      if (error) throw new Error(`upload failed: ${error.message}`)
      return supabase.storage.from(WELLNESS_BUCKET).getPublicUrl(path).data.publicUrl
    },
    log: (entry) => kv.set(`admin:eventlog:${new Date().toISOString()}:${crypto.randomUUID().slice(0, 8)}`, { ...entry, at: new Date().toISOString() }),
    seenAt: async (userId) => {
      const v = (await kv.get(`admin:seen:events:${userId}`)) as { at?: unknown } | null
      return typeof v?.at === 'string' ? v.at : null
    },
    markSeen: (userId, at) => kv.set(`admin:seen:events:${userId}`, { at }),
    photoBase: `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${WELLNESS_BUCKET}/`,
    now: () => new Date(),
  },
  // Catalogue review: each decision is one SQL function call as service_role (catalogueQuery.ts).
  catalogue: {
    decidePlace: async (actor, placeId, body) =>
      decideResultFrom((await asServiceRole(PLACE_SQL, placeParams(actor, placeId, body)))[0]?.result),
    decideActivity: async (actor, placeId, itemId, body) =>
      decideResultFrom((await asServiceRole(ACTIVITY_SQL, activityParams(actor, placeId, itemId, body)))[0]?.result),
    decideEvent: async (actor, itemId, body) =>
      decideResultFrom((await asServiceRole(EVENT_SQL, eventParams(actor, itemId, body)))[0]?.result),
    decideContent: async (actor, contentId, body) =>
      decideResultFrom((await asServiceRole(CONTENT_SQL, contentParams(actor, contentId, body)))[0]?.result),
    undoRun: async (actor, runId) => undoFromJson((await asServiceRole(UNDO_SQL, undoParams(actor, runId)))[0]?.result),
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
