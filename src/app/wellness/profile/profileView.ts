/**
 * What /profile shows. Members (and visitors) stay on the Bestie side, where signing in is the Join
 * sign-in (magic link or Google) and a signed-in Member is sent on to her Day plan. Only admins get
 * the old podcast admin profile.
 */
export type ProfileView = 'loading' | 'wellness' | 'admin'

export function profileView(s: { authLoading: boolean; isLoggedIn: boolean; adminChecked: boolean; isAdmin: boolean }): ProfileView {
  if (s.authLoading) return 'loading'
  if (!s.isLoggedIn) return 'wellness'
  if (!s.adminChecked) return 'loading'
  return s.isAdmin ? 'admin' : 'wellness'
}
