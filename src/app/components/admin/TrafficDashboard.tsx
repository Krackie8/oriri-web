/** Admin › Traffic: cookieless first-party counts (visits, pages, sources, place clicks). */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useAuth } from '../../hooks/useAuth';
import * as wellnessApi from '../../utils/wellnessApi';
import type { DayStats } from '../../utils/wellnessApi';

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

function sumMaps(days: DayStats[], key: 'pages' | 'sources' | 'places') {
  const out: Record<string, number> = {};
  for (const d of days) for (const [k, v] of Object.entries(d[key] || {})) out[k] = (out[k] || 0) + v;
  return Object.entries(out).sort((a, b) => b[1] - a[1]);
}

function TopList({ title, rows, label = (k: string) => k, empty }: { title: string; rows: [string, number][]; label?: (k: string) => string; empty: string }) {
  const max = rows[0]?.[1] || 1;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length ? (
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
  const [data, setData] = useState<DayStats[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setData(null);
    setError('');
    const res = await wellnessApi.getStats(token, days);
    if (res.ok && res.data) setData(res.data);
    else setError(res.error || 'Could not load traffic');
  }, [token, days]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(
    () => (data || []).reduce((t, d) => ({ visits: t.visits + d.sessions, views: t.views + d.views, clicks: t.clicks + d.clicks }), { visits: 0, views: 0, clicks: 0 }),
    [data],
  );
  const chart = useMemo(
    () => (data || []).map((d) => ({ day: new Date(`${d.date}T00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), Visits: d.sessions, 'Page views': d.views })),
    [data],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Website traffic</h2>
          <p className="text-sm text-muted-foreground">Counted on our own server, no cookies, so it includes visitors who decline the cookie banner. Dubai time.</p>
        </div>
        <div className="flex gap-2">
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
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['Visits', totals.visits, 'Separate browsing sessions'],
              ['Page views', totals.views, 'Every page opened'],
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
              <CardTitle className="text-base">Visits per day</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#EEE9E4" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip cursor={{ fill: 'rgba(125,109,97,0.08)' }} />
                  <Bar dataKey="Visits" fill="#7D6D61" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <TopList title="Where visitors come from" rows={sumMaps(data, 'sources')} empty="No visits yet." />
            <TopList title="Top pages" rows={sumMaps(data, 'pages')} label={(k) => PAGE_NAMES[k] || k} empty="No page views yet." />
            <TopList title="Most-clicked places" rows={sumMaps(data, 'places')} empty="No directory clicks yet." />
          </div>
        </>
      )}
    </div>
  );
}
