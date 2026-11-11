/** Admin › Traffic: cookieless first-party counts (visits, leads, sources, pages, devices, place clicks). */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useAuth } from '../../hooks/useAuth';
import * as wellnessApi from '../../utils/wellnessApi';
import type { DayStats, StatsSite } from '../../utils/wellnessApi';

const SITES: { id: StatsSite; label: string }[] = [
  { id: 'prod', label: 'Live site' },
  { id: 'staging', label: 'Staging' },
];

const FORM_NAMES: Record<string, string> = {
  free_day: 'Free day trial',
  pilot_application: 'Waitlist form',
  bestie_waitlist: 'Bestie waitlist',
  signup: 'New account',
};

const SOURCE_NAMES: Record<string, string> = {
  direct: 'Direct / typed in',
  instagram: 'Instagram',
  facebook: 'Facebook',
  google: 'Google',
  whatsapp: 'WhatsApp',
  tiktok: 'TikTok',
  'link-in-bio': 'Link in bio',
  youtube: 'YouTube',
  x: 'X / Twitter',
  search: 'Other search',
  mobile: 'Phone or tablet',
  desktop: 'Computer',
};
const niceSource = (k: string) => SOURCE_NAMES[k] || k;

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

const PAGE_NAMES: Record<string, string> = {
  '/': 'Home',
  '/plan': 'Plan · options',
  '/plan/inputs': 'Plan · check-in',
  '/plan/day': 'Plan · your day',
  '/membership': 'Membership',
  '/pilot': 'Waitlist',
  '/about': 'About',
  '/privacy': 'Privacy',
  '/shop': 'Shop',
  '/podcast': 'Podcast',
  '/profile': 'Profile',
};

type MapKey = 'pages' | 'sources' | 'places' | 'devices' | 'forms' | 'leadSources';
function sumMaps(days: DayStats[], key: MapKey) {
  const out: Record<string, number> = {};
  for (const d of days) for (const [k, v] of Object.entries(d[key] || {})) out[k] = (out[k] || 0) + v;
  return Object.entries(out).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
}

function TopList({
  title,
  rows,
  label = (k: string) => k,
  empty,
  sorted = true,
}: {
  title: string;
  rows: [string, number][];
  label?: (k: string) => string;
  empty: string;
  /** false keeps the given order (e.g. a funnel) and scales bars to the largest row. */
  sorted?: boolean;
}) {
  const max = (sorted ? rows[0]?.[1] : Math.max(...rows.map((r) => r[1]), 0)) || 1;
  const hasData = rows.some((r) => r[1] > 0);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length && hasData ? (
          <ul className="space-y-2">
            {rows.slice(0, 10).map(([k, v]) => (
              <li key={k} className="text-sm">
                <div className="flex justify-between gap-3">
                  <span className="truncate">{label(k)}</span>
                  <span className="tabular-nums text-muted-foreground">{v}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className="h-1.5 rounded-full bg-[#7D6D61]" style={{ width: `${(v / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function TrafficDashboard() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [days, setDays] = useState(30);
  const [site, setSite] = useState<StatsSite>('prod');
  const [data, setData] = useState<DayStats[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setData(null);
    setError('');
    const res = await wellnessApi.getStats(token, days, site);
    if (res.ok && res.data) setData(res.data);
    else setError(res.error || 'Could not load traffic');
  }, [token, days, site]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(
    () =>
      (data || []).reduce(
        (t, d) => ({ visits: t.visits + d.sessions, views: t.views + d.views, clicks: t.clicks + d.clicks, leads: t.leads + (d.leads || 0) }),
        { visits: 0, views: 0, clicks: 0, leads: 0 },
      ),
    [data],
  );
  const chart = useMemo(
    () => (data || []).map((d) => ({ day: new Date(`${d.date}T00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), Visits: d.sessions, Leads: d.leads || 0 })),
    [data],
  );

  // Planner funnel from page views: how far people get through the free day.
  const funnel = useMemo(() => {
    const pages = Object.fromEntries(sumMaps(data || [], 'pages'));
    const steps: [string, number][] = [
      ['Visits', totals.visits],
      ['Opened the planner', pages['/plan'] || 0],
      ['Filled in the check-in', pages['/plan/inputs'] || 0],
      ['Saw their day', pages['/plan/day'] || 0],
      ['Left their email (all forms)', totals.leads],
    ];
    return steps;
  }, [data, totals]);
  const rate = totals.visits ? `${((totals.leads / totals.visits) * 100).toFixed(1)}%` : '–';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Website traffic</h2>
          <p className="text-sm text-muted-foreground">
            Counted on our own server, no cookies, so it includes visitors who decline the cookie banner. Dubai time. Your own visits on this device are not counted.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SITES.map((s) => (
            <Button key={s.id} size="sm" variant={site === s.id ? 'default' : 'outline'} onClick={() => setSite(s.id)}>
              {s.label}
            </Button>
          ))}
          <span className="mx-1 w-px self-stretch bg-border" aria-hidden />
          {RANGES.map((r) => (
            <Button key={r.days} size="sm" variant={days === r.days ? 'default' : 'outline'} onClick={() => setDays(r.days)}>
              {r.label}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={load} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {[
              ['Visits', totals.visits, 'Separate browsing sessions'],
              ['Page views', totals.views, 'Every page opened'],
              ['Leads', totals.leads, 'Sign-up forms completed'],
              ['Visit → lead', rate, 'Share of visits that left an email'],
              ['Directory clicks', totals.clicks, 'Taps on Instagram, website or map'],
            ].map(([title, value, desc]) => (
              <Card key={title as string}>
                <CardHeader className="pb-1">
                  <CardDescription>{title}</CardDescription>
                  <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">{desc}</CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Visits and leads per day</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#EEE9E4" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip cursor={{ fill: 'rgba(125,109,97,0.08)' }} />
                  <Bar dataKey="Visits" fill="#7D6D61" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Leads" fill="#C9A27E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <TopList title="Free day funnel" rows={funnel} sorted={false} empty="No visits yet." />
            <TopList title="Where visitors come from" rows={sumMaps(data, 'sources')} label={niceSource} empty="No visits yet." />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <TopList title="Where leads come from" rows={sumMaps(data, 'leadSources')} label={niceSource} empty="No leads yet." />
            <TopList title="Leads by form" rows={sumMaps(data, 'forms')} label={(k) => FORM_NAMES[k] || k} empty="No leads yet." />
            <TopList title="Phone or computer" rows={sumMaps(data, 'devices')} label={niceSource} empty="No device data yet." />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <TopList title="Top pages" rows={sumMaps(data, 'pages')} label={(k) => PAGE_NAMES[k] || k} empty="No page views yet." />
            <TopList title="Most-clicked places" rows={sumMaps(data, 'places')} empty="No directory clicks yet." />
          </div>
        </>
      )}
    </div>
  );
}
