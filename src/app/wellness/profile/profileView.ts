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

/**
 * Whether the admin check has finished for the user signed in now. A check left over from before
 * sign-in (or for someone else) does not count, or an admin would be sent away from /profile.
 */
export function adminCheckDone(s: { userId: string | null | undefined; checkedFor: string | null; checking: boolean }): boolean {
  return !!s.userId && s.checkedFor === s.userId && !s.checking
}
