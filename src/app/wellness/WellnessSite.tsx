import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { CookieBanner, SiteFooter, SiteHeader } from './components/Chrome';
import BottomTabBar from '../components/BottomTabBar';
import HomeScreen from './bestie/HomeScreen';
import InputScreen from './bestie/InputScreen';
import DayScreen from './bestie/DayScreen';
import MembershipScreen from './bestie/MembershipScreen';
import AboutPage from './pages/AboutPage';
import PrivacyPage from './pages/PrivacyPage';
import ShopPage from './pages/ShopPage';
import PodcastPage from './pages/PodcastPage';
import BestiePage from './pages/BestiePage';
import GuestProfilePage from './pages/GuestProfilePage';
import WeeklyRecap from './bestie/WeeklyRecap';
import { captureAttribution } from './analytics/utm';
import { countPageView } from './analytics/firstParty';
import { flushPendingFreeDay } from './api';
import { getConsent, loadTrackers, onConsentChange } from './analytics/consent';
import seo from './seo.json';
import { installOutboundTracking, trackPageView, useScrollDepth } from './analytics/track';

/** Paths served by the Wellness Bestie marketing site (everything else is the podcast app). */
export const WELLNESS_PATHS = ['/', '/plan', '/plan/inputs', '/plan/day', '/membership', '/bestie', '/pilot', '/about', '/privacy', '/shop', '/podcast', '/community'];
export const isWellnessPath = (p: string) => WELLNESS_PATHS.includes(p.replace(/\/+$/, '') || '/');

type SeoPage = { title: string; description: string; index: boolean };
const SEO_PAGES = seo.pages as Record<string, SeoPage>;

/** Title, description, canonical and robots for the current page (same data the build bakes into each page's HTML). */
/** The old waitlist form. Joining now happens on the free day sign-up, so old links (with their UTMs) open the planner. */
function JoinRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/plan/inputs${search}`} replace />;
}

function applySeo(path: string) {
  const page = SEO_PAGES[path] || SEO_PAGES['/'];
  const canonicalPath = SEO_PAGES[path] ? path : '/';
  document.title = page.title;
  const set = (selector: string, attr: string, value: string, create: () => HTMLElement) => {
    let el = document.head.querySelector(selector);
    if (!el) {
      el = create();
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
  };
  const meta = (key: 'name' | 'property', name: string) => () => {
    const m = document.createElement('meta');
    m.setAttribute(key, name);
    return m;
  };
  set('meta[name="description"]', 'content', page.description, meta('name', 'description'));
  set('meta[property="og:title"]', 'content', page.title, meta('property', 'og:title'));
  set('meta[property="og:description"]', 'content', page.description, meta('property', 'og:description'));
  set('meta[property="og:url"]', 'content', seo.site + canonicalPath, meta('property', 'og:url'));
  const staging = !/^(www\.)?oriri\.me$/i.test(window.location.hostname);
  set('meta[name="robots"]', 'content', page.index && !staging ? 'index, follow' : 'noindex, follow', meta('name', 'robots'));
  set('link[rel="canonical"]', 'href', seo.site + (canonicalPath === '/' ? '/' : canonicalPath), () => {
    const l = document.createElement('link');
    l.setAttribute('rel', 'canonical');
    return l;
  });
}

// Capture UTMs as early as possible, before any route change can drop them.
if (typeof window !== 'undefined') captureAttribution();

export default function WellnessSite() {
  const location = useLocation();
  const [cookieSettingsOpen, setCookieSettingsOpen] = useState(false);
  const [consent, setConsentState] = useState(getConsent());

  // Scope the 16px base + greige ground to this site only.
  useLayoutEffect(() => {
    const html = document.documentElement;
    html.classList.add('wb-site');
    html.classList.remove('dark');
    const meta = document.querySelector('meta[name="theme-color"]');
    const prevTheme = meta?.getAttribute('content');
    meta?.setAttribute('content', '#FAF8F5');
    return () => {
      html.classList.remove('wb-site');
      if (meta && prevTheme) meta.setAttribute('content', prevTheme);
    };
  }, []);

  useEffect(() => {
    captureAttribution();
    installOutboundTracking(); // outbound_click on every external link
    flushPendingFreeDay(); // re-send a free-day email saved while offline
    loadTrackers(); // no-op unless the visitor has already accepted
    return onConsentChange((c) => {
      setConsentState(c);
      if (c === 'granted') trackPageView(document.title); // count the page they accepted on
    });
  }, []);

  // page_view on every route change (GA4 is configured with send_page_view: false)
  useEffect(() => {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    applySeo(path);
    if (!location.hash) {
      // The page scrolls on <body>, so reset every scroller, not just the window
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    } else {
      // In-app links like /bestie#stepsisters: scroll to the section once it has rendered
      const id = decodeURIComponent(location.hash.slice(1));
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }), 150);
    }
    trackPageView(document.title);
    countPageView(path); // cookieless first-party count for the admin Traffic tab
  }, [location.pathname, location.hash]);

  // scroll_depth 25/50/75/100 on every page
  useScrollDepth(true, location.pathname);

  const bannerOpen = cookieSettingsOpen || consent === null;
  // Screens with their own pinned button hide the tab bar
  const showTabs = !['/plan/inputs'].includes(location.pathname.replace(/\/+$/, ''));

  return (
    <div className="wb-root wb-grain min-h-screen bg-wb-paper text-wb-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-wb-ink focus:px-4 focus:py-2 focus:text-wb-shell">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/plan" element={<Navigate to="/plan/inputs" replace />} />
          <Route path="/plan/inputs" element={<InputScreen />} />
          <Route path="/plan/day" element={<DayScreen />} />
          <Route path="/membership" element={<MembershipScreen />} />
          <Route path="/bestie" element={<BestiePage />} />
          <Route path="/pilot" element={<JoinRedirect />} />
          {/* Old podcast-app community page: Stepsisters now lives on the Bestie community page */}
          <Route path="/community" element={<Navigate to="/bestie#stepsisters" replace />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/podcast" element={<PodcastPage />} />
          {/* Only reached by guests: App.tsx sends signed-in users to the full profile */}
          <Route path="/profile" element={<GuestProfilePage />} />
          <Route path="/privacy" element={<PrivacyPage onCookieSettings={() => setCookieSettingsOpen(true)} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <SiteFooter onCookieSettings={() => setCookieSettingsOpen(true)} />
      {showTabs && (
        <>
          <div aria-hidden className="h-20" />
          <BottomTabBar />
        </>
      )}
      <WeeklyRecap />
      <CookieBanner forceOpen={cookieSettingsOpen} onClose={() => setCookieSettingsOpen(false)} />
    </div>
  );
}
