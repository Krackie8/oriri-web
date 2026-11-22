import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { supabase } from '../utils/supabase/client'
import { adminClient } from '../wellness/functionClient/adminClient'
import type { Overview } from '../wellness/functionClient/admin'
import HomeScreen from './HomeScreen'
import LoginScreen from './LoginScreen'
import OverviewScreen from './OverviewScreen'

type Who = { kind: 'checking' } | { kind: 'login' } | { kind: 'failed' } | { kind: 'in'; firstName: string | null }
type Numbers = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; overview: Overview }

export default function AdminSite() {
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const [who, setWho] = useState<Who>({ kind: 'checking' })
  const [screen, setScreen] = useState<'home' | 'overview'>('home')
  const [numbers, setNumbers] = useState<Numbers>({ kind: 'loading' })
  const [menu, setMenu] = useState(false)

  useLayoutEffect(() => {
    const html = document.documentElement
    html.classList.add('wb-site')
    html.classList.remove('dark')
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex'
    document.head.appendChild(robots)
    const prevTitle = document.title
    document.title = 'Oriri Admin'
    return () => {
      html.classList.remove('wb-site')
      robots.remove()
      document.title = prevTitle
    }
  }, [])

  // Whether a session exists. The sign-in link lands here with tokens, which the client picks up.
  useEffect(() => {
    let live = true
    supabase.auth
      .getSession()
      .then(({ data }) => live && setHasSession((prev) => prev ?? !!data.session))
      .catch(() => live && setHasSession((prev) => prev ?? false))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setHasSession(!!session))
    return () => {
      live = false
      data.subscription.unsubscribe()
    }
  }, [])

  const loadMe = useCallback(async () => {
    setWho({ kind: 'checking' })
    const r = await adminClient.me()
    if (r.ok) setWho(r.data.isAdmin ? { kind: 'in', firstName: r.data.firstName } : { kind: 'login' })
    else setWho(r.error.status === 401 || r.error.status === 403 ? { kind: 'login' } : { kind: 'failed' })
  }, [])

  useEffect(() => {
    if (hasSession === null) return
    if (!hasSession) {
      setWho({ kind: 'login' })
      setScreen('home')
      return
    }
    void loadMe()
  }, [hasSession, loadMe])

  const loadOverview = useCallback(async () => {
    setNumbers({ kind: 'loading' })
    const r = await adminClient.overview()
    setNumbers(r.ok ? { kind: 'ready', overview: r.data } : { kind: 'error' })
  }, [])

  const signedIn = who.kind === 'in'
  useEffect(() => {
    if (signedIn) void loadOverview()
  }, [signedIn, loadOverview])

  const signOut = async () => {
    setMenu(false)
    try {
      await supabase.auth.signOut()
    } catch {
      /* the session listener still moves us on if it did end */
    }
    setHasSession(false)
  }

  let body: React.ReactNode = null
  if (who.kind === 'checking') {
    body = <p className="text-base text-wb-soft">One moment…</p>
  } else if (who.kind === 'failed') {
    body = (
      <div role="alert">
        <p className="text-base text-wb-ink">Couldn't check your sign-in. Try again.</p>
        <button type="button" onClick={() => void loadMe()} className="mt-4 rounded-full px-6 py-2.5 text-base text-white" style={{ backgroundColor: '#C98A90' }}>
          Try again
        </button>
      </div>
    )
  } else if (who.kind === 'in') {
    body =
      screen === 'overview' ? (
        <OverviewScreen state={numbers} onRetry={() => void loadOverview()} />
      ) : (
        <HomeScreen
          firstName={who.firstName}
          overview={numbers.kind === 'ready' ? numbers.overview : null}
          onOpen={(key) => key === 'overview' && setScreen('overview')}
        />
      )
  }

  return (
    <div className="wb-root min-h-screen bg-wb-paper text-wb-ink">
      {who.kind === 'login' ? (
        <LoginScreen />
      ) : (
        <div className="mx-auto max-w-3xl px-6 py-8 sm:py-12">
          <header className="mb-10 flex items-center justify-between">
            {who.kind === 'in' && screen === 'overview' ? (
              <button type="button" onClick={() => setScreen('home')} className="text-base text-wb-taupe">
                ← Home
              </button>
            ) : (
              <span className="text-base text-wb-taupe">Oriri Admin</span>
            )}
            {who.kind === 'in' && (
              <div className="relative">
                <button type="button" onClick={() => setMenu((m) => !m)} aria-expanded={menu} className="text-base text-wb-ink">
                  {who.firstName || 'Menu'} ▾
                </button>
                {menu && (
                  <div className="absolute right-0 mt-2 w-40 rounded-2xl border border-wb-sand bg-wb-shell py-2 shadow-sm z-10">
                    <button type="button" onClick={() => void signOut()} className="block w-full px-4 py-2 text-left text-base text-wb-ink">
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </header>
          {body}
          <a href="/admin/legacy" className="mt-16 inline-block text-sm text-wb-taupe underline underline-offset-4">
            Old admin
          </a>
        </div>
      )}
    </div>
  )
}
