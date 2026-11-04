import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { CookieBanner, SiteFooter, SiteHeader } from './components/Chrome';
import BottomTabBar from '../components/BottomTabBar';
import HomeScreen from './bestie/HomeScreen';
import OptionsScreen from './bestie/OptionsScreen';
import InputScreen from './bestie/InputScreen';
import DayScreen from './bestie/DayScreen';
import MembershipScreen from './bestie/MembershipScreen';
import PilotPage from './pages/PilotPage';
import AboutPage from './pages/AboutPage';
import PrivacyPage from './pages/PrivacyPage';
import ShopPage from './pages/ShopPage';
import { captureAttribution } from './analytics/utm';
import { flushPendingFreeDay } from './api';
import { getConsent, loadTrackers, onConsentChange } from './analytics/consent';
import { installOutboundTracking, trackPageView, useScrollDepth } from './analytics/track';

/** Paths served by the Wellness Bestie marketing site (everything else is the podcast app). */
export const WELLNESS_PATHS = ['/', '/plan', '/plan/inputs', '/plan/day', '/membership', '/bestie', '/pilot', '/about', '/privacy', '/shop'];
export const isWellnessPath = (p: string) => WELLNESS_PATHS.includes(p.replace(/\/+$/, '') || '/');

const TITLES: Record<string, string> = {
  '/': 'Wellness Bestie by ORIRI · Your wellness, already planned',
  '/plan': 'Plan my day · Wellness Bestie by ORIRI',
  '/plan/inputs': 'Plan my day · Wellness Bestie by ORIRI',
  '/plan/day': 'Your day, curated · Wellness Bestie by ORIRI',
  '/membership': 'Membership · Wellness Bestie by ORIRI',
  '/pilot': 'Join the waitlist · Wellness Bestie by ORIRI',
  '/about': 'About ORIRI',
  '/privacy': 'Privacy · ORIRI',
  '/shop': 'Shop · ORIRI',
};

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
    meta?.setAttribute('content', '#F7F3EE');
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
    document.title = TITLES[path] || TITLES['/'];
    if (!location.hash) window.scrollTo(0, 0);
    trackPageView(document.title);
  }, [location.pathname, location.hash]);

  // scroll_depth 25/50/75/100 on every page
  useScrollDepth(true, location.pathname);

  const bannerOpen = cookieSettingsOpen || consent === null;
  // Screens with their own pinned button hide the tab bar
  const showTabs = !['/plan/inputs', '/pilot'].includes(location.pathname.replace(/\/+$/, ''));

  return (
    <div className="wb-root wb-grain min-h-screen bg-wb-paper text-wb-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-wb-ink focus:px-4 focus:py-2 focus:text-wb-shell">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/plan" element={<OptionsScreen />} />
          <Route path="/plan/inputs" element={<InputScreen />} />
          <Route path="/plan/day" element={<DayScreen />} />
          <Route path="/membership" element={<MembershipScreen />} />
          <Route path="/bestie" element={<Navigate to="/" replace />} />
          <Route path="/pilot" element={<PilotPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/shop" element={<ShopPage />} />
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
      <CookieBanner forceOpen={cookieSettingsOpen} onClose={() => setCookieSettingsOpen(false)} />
    </div>
  );
}
