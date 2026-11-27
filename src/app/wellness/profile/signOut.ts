/**
 * Sign out on the Profile. This device only: her phone signing out leaves her other devices signed in.
 * False when she is still signed in, so the page can say so.
 */
export async function signOutThisDevice(auth: { signOut(options: { scope: 'local' }): Promise<{ error: unknown }> }): Promise<boolean> {
  try {
    return !(await auth.signOut({ scope: 'local' })).error
  } catch {
    return false
  }
}
