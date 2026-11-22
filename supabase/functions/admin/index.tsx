import { createClient } from 'npm:@supabase/supabase-js@2'
import { hasAdminRole, type RolesReader } from '../server/adminRole.ts'
import { createAdminApp } from './app.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const app = createAdminApp({
  // Admin = a live admin row in public.user_roles, read as service_role (adminRole.ts).
  isAdmin: (id) => hasAdminRole(supabase as unknown as RolesReader, id),
  userFromToken: async (token) => {
    if (!token) return null
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return null
    return { id: user.id, email: user.email ?? '' }
  },
  signInLink: {},
  overview: {},
  me: {},
})

Deno.serve(app.fetch)
