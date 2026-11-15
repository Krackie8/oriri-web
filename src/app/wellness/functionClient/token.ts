/**
 * The real getToken: the signed-in user's access token, or the anon key when
 * no one is signed in (or the session can't be read).
 */
import type { GetToken } from './core'

interface AuthLike {
  getSession(): Promise<{ data: { session: { access_token: string } | null } }>
}

export const tokenFromSession =
  (auth: AuthLike, anonKey: string): GetToken =>
  async () => {
    try {
      return (await auth.getSession()).data.session?.access_token || anonKey
    } catch {
      return anonKey
    }
  }
