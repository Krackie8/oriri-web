import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { supabase } from '../utils/supabase/client'
import { adminClient } from '../wellness/functionClient/adminClient'
import type { Overview } from '../wellness/functionClient/admin'
import HomeScreen from './HomeScreen'
import LoginScreen from './LoginScreen'
import MembersScreen from './MembersScreen'
import OverviewScreen from './OverviewScreen'
import TeamScreen from './TeamScreen'
import { AFTER_SIGN_IN_KEY, decideScreen, type MeResult } from './view'

type Numbers = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; gen: number; overview: Overview }

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C98A90]'

export default function AdminSite() {
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const [gen, setGen] = useState(0)
  const [me, setMe] = useState<MeResult>({ kind: 'pending' })
  const [firstName, setFirstName] = useState<string | null>(null)
  const [screen, setScreen] = useState<'home' | 'overview' | 'members' | 'team'>('home')
  const [teamCount, setTeamCount] = useState<number | null>(null)
  const [numbers, setNumbers] = useState<Numbers>({ kind: 'loading' })
  const [menu, setMenu] = useState(false)
  // Counts session changes. A late answer for an older session is dropped.
  const genRef = useRef(0)
  const whoRef = useRef<string | null | undefined>(undefined)

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

  const applySession = useCallback((userId: string | null) => {
    if (whoRef.current === userId) return // a token refresh, not a change
    whoRef.current = userId
    genRef.current += 1
    setGen(genRef.current)
    setHasSession(userId !== null)
    setMe({ kind: 'pending' })
    setNumbers({ kind: 'loading' })
    setTeamCount(null)
    if (userId === null) {
      setScreen('home')
      setMenu(false)
    }
  }, [])

  // Whether a session exists. The sign-in link lands here with tokens, which the client picks up.
  useEffect(() => {
    let live = true
    supabase.auth
      .getSession()
      .then(({ data }) => live && whoRef.current === undefined && applySession(data.session?.user.id ?? null))
      .catch(() => live && whoRef.current === undefined && applySession(null))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => applySession(session?.user.id ?? null))
    return () => {
      live = false
      data.subscription.unsubscribe()
    }
  }, [applySession])

  const loadMe = useCallback(async () => {
    const g = genRef.current
    setMe({ kind: 'pending' })
    const r = await adminClient.me()
    if (g !== genRef.current) return
    if (r.ok) {
      setFirstName(r.data.firstName)
      setMe({ kind: 'ok', gen: g, isAdmin: r.data.isAdmin })
    } else {
      setMe(r.error.status === 401 || r.error.status === 403 ? { kind: 'unauthorised', gen: g } : { kind: 'failed', gen: g })
    }
  }, [])

  useEffect(() => {
    if (hasSession) void loadMe()
  }, [hasSession, gen, loadMe])

  const loadOverview = useCallback(async () => {
    const g = genRef.current
    setNumbers({ kind: 'loading' })
    const r = await adminClient.overview()
    if (g !== genRef.current) return
    setNumbers(r.ok ? { kind: 'ready', gen: g, overview: r.data } : { kind: 'error' })
  }, [])

  const where = decideScreen(hasSession, gen, me)
  useEffect(() => {
    if (where === 'home') void loadOverview()
  }, [where, gen, loadOverview])

  // The Team tile's count, asked once each time Home shows. Stays "Team" until it answers or if it fails.
  useEffect(() => {
    if (where !== 'home' || screen !== 'home') return
    const g = genRef.current
    let live = true
    void adminClient.team().then((r) => {
      if (live && g === genRef.current) setTeamCount(r.ok ? r.data.members.length : null)
    })
    return () => {
      live = false
    }
  }, [where, screen, gen])

  // Coming back from the "sign in again" link: open Team once.
  useEffect(() => {
    if (where !== 'home') return
    try {
      if (localStorage.getItem(AFTER_SIGN_IN_KEY) === 'team') {
        localStorage.removeItem(AFTER_SIGN_IN_KEY)
        setScreen('team')
      }
    } catch {
      /* no storage, no reopening */
    }
  }, [where])

  const currentGen = useCallback(() => genRef.current, [])

  // Numbers from an older session are never shown.
  const current = numbers.kind === 'ready' && numbers.gen === gen ? numbers.overview : null

  const signOut = async () => {
    setMenu(false)
    try {
      await supabase.auth.signOut()
    } catch {
      /* the screen moves on below either way */
    }
    applySession(null)
  }

  let body: React.ReactNode = null
  if (where === 'checking') {
    body = <p className="text-base text-wb-soft">One moment…</p>
  } else if (where === 'retry') {
    body = (
      <div role="alert">
        <p className="text-base text-wb-ink">Couldn't check your sign-in. Try again.</p>
        <button
          type="button"
          onClick={() => void loadMe()}
          className={`mt-4 rounded-full px-6 py-2.5 text-base text-white ${FOCUS} focus-visible:ring-offset-2`}
          style={{ backgroundColor: '#C98A90' }}
        >
          Try again
        </button>
      </div>
    )
  } else if (where === 'home') {
    const overviewState = current ? ({ kind: 'ready', overview: current } as const) : numbers.kind === 'error' ? ({ kind: 'error' } as const) : ({ kind: 'loading' } as const)
    body =
      screen === 'overview' ? (
        <OverviewScreen state={overviewState} onRetry={() => void loadOverview()} />
      ) : screen === 'members' ? (
        <MembersScreen currentGen={currentGen} />
      ) : screen === 'team' ? (
        <TeamScreen currentGen={currentGen} />
      ) : (
        <HomeScreen
          firstName={firstName}
          overview={current}
          teamCount={teamCount}
          onOpen={(key) => (key === 'overview' || key === 'members' || key === 'team') && setScreen(key)}
        />
      )
  }

  return (
    <div className="wb-root min-h-screen bg-wb-paper text-wb-ink">
      {where === 'login' ? (
        <LoginScreen />
      ) : (
        <div className="mx-auto max-w-3xl px-6 py-8 sm:py-12">
          <header className="mb-10 flex items-center justify-between">
            {where === 'home' && screen !== 'home' ? (
              <button type="button" onClick={() => setScreen('home')} className={`text-base text-wb-taupe rounded ${FOCUS}`}>
                ← Home
              </button>
            ) : (
              <span className="text-base text-wb-taupe">Oriri Admin</span>
            )}
            {where === 'home' && (
              <div className="relative">
                <button type="button" onClick={() => setMenu((m) => !m)} aria-expanded={menu} className={`text-base text-wb-ink rounded ${FOCUS}`}>
                  {firstName || 'Menu'} ▾
                </button>
                {menu && (
                  <div className="absolute right-0 mt-2 w-40 rounded-2xl border border-wb-sand bg-wb-shell py-2 shadow-sm z-10">
                    <button type="button" onClick={() => void signOut()} className={`block w-full px-4 py-2 text-left text-base text-wb-ink ${FOCUS}`}>
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
