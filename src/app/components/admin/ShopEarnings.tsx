/**
 * Admin › Shop: affiliate earnings. Amazon and Shopee only report sales in their own
 * dashboards, so Ren copies three numbers per program each month. Shown next to the
 * Shop clicks we count on our own site.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useAuth } from '../../hooks/useAuth';
import * as wellnessApi from '../../utils/wellnessApi';
import type { DayStats, EarnProgram, EarningsRow } from '../../utils/wellnessApi';

const PROGRAMS: { key: EarnProgram; label: string; sub: string; currency: string; city: 'dubai' | 'kl' }[] = [
  { key: 'amazon-web', label: 'Amazon.ae · website', sub: 'Tracking ID oriri-21', currency: 'AED', city: 'dubai' },
  { key: 'amazon-social', label: 'Amazon.ae · social', sub: 'Tracking ID ren097-21', currency: 'AED', city: 'dubai' },
  { key: 'shopee', label: 'Shopee Malaysia', sub: 'Affiliate links', currency: 'RM', city: 'kl' },
];

const thisMonth = () => new Date().toISOString().slice(0, 7);
const monthName = (m: string) => new Date(`${m}-01T00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const money = (v: number, cur: string) => `${cur} ${v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Draft = Record<EarnProgram, { clicks: string; orders: string; earnings: string }>;
const emptyDraft = (): Draft => ({
  'amazon-web': { clicks: '', orders: '', earnings: '' },
  'amazon-social': { clicks: '', orders: '', earnings: '' },
  shopee: { clicks: '', orders: '', earnings: '' },
});

export default function ShopEarnings() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [rows, setRows] = useState<EarningsRow[] | null>(null);
  const [stats, setStats] = useState<DayStats[]>([]);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(thisMonth());
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setError('');
    const [e, s] = await Promise.all([wellnessApi.getEarnings(token), wellnessApi.getStats(token, 90)]);
    if (e.ok && e.data) setRows(e.data);
    else setError(e.error || 'Could not load earnings');
    if (s.ok && s.data) setStats(s.data);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Fill the form with what is already saved for the chosen month.
  useEffect(() => {
    const d = emptyDraft();
    for (const r of rows || []) {
      if (r.month !== month) continue;
      d[r.program] = { clicks: String(r.clicks || ''), orders: String(r.orders || ''), earnings: String(r.earnings || '') };
    }
    setDraft(d);
    setSaved('');
  }, [month, rows]);

  /** Shop clicks counted on our site, per month and city (last 90 days only). */
  const siteClicks = useMemo(() => {
    const out: Record<string, { dubai: number; kl: number }> = {};
    for (const d of stats) {
      const m = d.date.slice(0, 7);
      for (const [k, v] of Object.entries(d.places || {})) {
        const city = k.split(':')[1];
        if (!k.startsWith('shop:') || (city !== 'dubai' && city !== 'kl')) continue;
        out[m] = out[m] || { dubai: 0, kl: 0 };
        out[m][city] += v;
      }
    }
    return out;
  }, [stats]);

  const months = useMemo(() => {
    const set = new Set<string>([...(rows || []).map((r) => r.month), ...Object.keys(siteClicks)]);
    return [...set].sort().reverse();
  }, [rows, siteClicks]);

  const get = (m: string, p: EarnProgram) => rows?.find((r) => r.month === m && r.program === p);
  const totals = useMemo(() => {
    const t = { aed: 0, rm: 0, orders: 0 };
    for (const r of rows || []) {
      if (r.program === 'shopee') t.rm += r.earnings;
      else t.aed += r.earnings;
      t.orders += r.orders;
    }
    return t;
  }, [rows]);

  async function save() {
    if (!token) return;
    setSaving(true);
    setSaved('');
    for (const p of PROGRAMS) {
      const d = draft[p.key];
      const has = d.clicks !== '' || d.orders !== '' || d.earnings !== '';
      if (!has) continue;
      const res = await wellnessApi.saveEarnings(token, {
        month,
        program: p.key,
        clicks: Number(d.clicks) || 0,
        orders: Number(d.orders) || 0,
        earnings: Number(d.earnings) || 0,
      });
      if (!res.ok) {
        setSaving(false);
        setSaved(res.error || 'Could not save');
        return;
      }
    }
    setSaving(false);
    setSaved('Saved');
    load();
  }

  async function remove(m: string, p: EarnProgram) {
    if (!token) return;
    await wellnessApi.deleteEarnings(token, m, p);
    load();
  }

  const setField = (p: EarnProgram, f: 'clicks' | 'orders' | 'earnings', v: string) =>
    setDraft((d) => ({ ...d, [p]: { ...d[p], [f]: v.replace(/[^0-9.]/g, '') } }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Shop earnings</h2>
          <p className="text-sm text-muted-foreground">
            Clicks are counted on our site. Orders and earnings come from your Amazon Associates and Shopee Affiliate reports, added once a month below.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load} aria-label="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['Earned on Amazon.ae', money(totals.aed, 'AED'), 'All months added so far'],
          ['Earned on Shopee', money(totals.rm, 'RM'), 'All months added so far'],
          ['Orders', String(totals.orders), 'Items people bought through your links'],
        ].map(([t, v, d]) => (
          <Card key={t}>
            <CardHeader className="pb-1">
              <CardDescription>{t}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{v}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">{d}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Add a month</CardTitle>
          <CardDescription>
            Amazon: Associates Central › Reports, pick the month, filter by tracking ID. Shopee: Affiliate › Reports › Conversion report. Leave a box empty if you have no number.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 text-sm">
            Month
            <Input type="month" value={month} max={thisMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} className="w-44" />
          </label>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 font-medium">Program</th>
                  <th className="py-2 font-medium">Their clicks</th>
                  <th className="py-2 font-medium">Orders</th>
                  <th className="py-2 font-medium">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {PROGRAMS.map((p) => (
                  <tr key={p.key} className="border-t">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{p.label}</div>
                      <div className="text-xs text-muted-foreground">{p.sub}</div>
                    </td>
                    {(['clicks', 'orders'] as const).map((f) => (
                      <td key={f} className="py-2 pr-3">
                        <Input inputMode="numeric" value={draft[p.key][f]} onChange={(e) => setField(p.key, f, e.target.value)} className="w-24" placeholder="0" />
                      </td>
                    ))}
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{p.currency}</span>
                        <Input inputMode="decimal" value={draft[p.key].earnings} onChange={(e) => setField(p.key, 'earnings', e.target.value)} className="w-28" placeholder="0.00" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : `Save ${monthName(month)}`}
            </Button>
            {saved && <span className="text-sm text-muted-foreground">{saved}</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Month by month</CardTitle>
          <CardDescription>"Site clicks" are taps on Shop now on oriri.me (kept for 90 days). Conversion = orders ÷ their clicks.</CardDescription>
        </CardHeader>
        <CardContent>
          {!months.length ? (
            <p className="text-sm text-muted-foreground">Nothing yet. Add your first month above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 font-medium">Month</th>
                    <th className="py-2 font-medium">Program</th>
                    <th className="py-2 text-right font-medium">Site clicks</th>
                    <th className="py-2 text-right font-medium">Their clicks</th>
                    <th className="py-2 text-right font-medium">Orders</th>
                    <th className="py-2 text-right font-medium">Conversion</th>
                    <th className="py-2 text-right font-medium">Earnings</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {months.map((m) =>
                    PROGRAMS.map((p) => ({
                      p,
                      r: get(m, p.key),
                      // Our site only links with oriri-21, so site clicks belong to the website row.
                      site: p.key === 'amazon-social' ? null : siteClicks[m]?.[p.city] || null,
                    }))
                      .filter((x) => x.r || x.site)
                      .map(({ p, r, site }, i) => {
                      return (
                        <tr key={m + p.key} className={i === 0 ? 'border-t' : ''}>
                          <td className="py-2 pr-3 font-medium">{i === 0 ? monthName(m) : ''}</td>
                          <td className="py-2 pr-3">{p.label}</td>
                          <td className="py-2 text-right tabular-nums">{site ?? '–'}</td>
                          <td className="py-2 text-right tabular-nums">{r ? r.clicks : '–'}</td>
                          <td className="py-2 text-right tabular-nums">{r ? r.orders : '–'}</td>
                          <td className="py-2 text-right tabular-nums">{r && r.clicks ? `${((r.orders / r.clicks) * 100).toFixed(1)}%` : '–'}</td>
                          <td className="py-2 text-right tabular-nums">{r ? money(r.earnings, p.currency) : '–'}</td>
                          <td className="py-2 pl-2 text-right">
                            {r && (
                              <button onClick={() => remove(m, p.key)} aria-label="Delete row" className="text-muted-foreground hover:text-foreground">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    }),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
