/** Admin › Calendar: who booked each event on the website. */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useAuth } from '../../hooks/useAuth';
import * as wellnessApi from '../../utils/wellnessApi';
import type { Rsvp } from '../../utils/wellnessApi';

const fmtDate = (d: string) => new Date(`${d}T00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

function toCsv(rows: Rsvp[]) {
  const cols: (keyof Rsvp)[] = ['eventTitle', 'eventDate', 'name', 'email', 'phone', 'guests', 'bookedAt', 'wb_source'];
  const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [cols.join(','), ...rows.map((r) => cols.map((c) => q(r[c])).join(','))].join('\n');
}

export default function EventBookings() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [rows, setRows] = useState<Rsvp[] | null>(null);
  const [error, setError] = useState('');
  const [showPast, setShowPast] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setError('');
    const res = await wellnessApi.getRsvps(token);
    if (res.ok && res.data) setRows(res.data);
    else setError(res.error || 'Could not load bookings');
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const groups = useMemo(() => {
    const map = new Map<string, { title: string; date: string; list: Rsvp[] }>();
    for (const r of rows || []) {
      if (!showPast && r.eventDate < today) continue;
      const g = map.get(r.ref) || { title: r.eventTitle, date: r.eventDate, list: [] };
      g.list.push(r);
      map.set(r.ref, g);
    }
    return [...map.entries()].sort((a, b) => a[1].date.localeCompare(b[1].date));
  }, [rows, showPast, today]);

  async function remove(r: Rsvp) {
    if (!token || !window.confirm(`Remove ${r.name} from ${r.eventTitle}?`)) return;
    await wellnessApi.deleteRsvp(token, r.ref, r.email);
    load();
  }

  function download(list: Rsvp[], title: string) {
    const blob = new Blob([toCsv(list)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-bookings.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Event bookings</CardTitle>
            <CardDescription>Who booked on the website. You also get an email for each new booking.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={showPast ? 'default' : 'outline'} onClick={() => setShowPast((v) => !v)}>
              {showPast ? 'Hide past' : 'Show past'}
            </Button>
            <Button size="sm" variant="outline" onClick={load} aria-label="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && <p className="text-sm text-muted-foreground">{error}</p>}
        {!rows && !error && <p className="text-sm text-muted-foreground">Loading…</p>}
        {rows && !groups.length && <p className="text-sm text-muted-foreground">No bookings yet.</p>}
        {groups.map(([ref, g]) => {
          const spots = g.list.reduce((t, r) => t + (r.guests || 1), 0);
          return (
            <div key={ref} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{g.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {fmtDate(g.date)} · {g.list.length} {g.list.length === 1 ? 'booking' : 'bookings'} · {spots} {spots === 1 ? 'spot' : 'spots'}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => download(g.list, g.title)}>
                  <Download className="mr-1.5 h-4 w-4" /> CSV
                </Button>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-1.5 font-medium">Name</th>
                      <th className="py-1.5 font-medium">Email</th>
                      <th className="py-1.5 font-medium">WhatsApp</th>
                      <th className="py-1.5 text-right font-medium">Spots</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {g.list.map((r) => (
                      <tr key={r.email} className="border-t">
                        <td className="py-1.5 pr-3">{r.name}</td>
                        <td className="py-1.5 pr-3">
                          <a href={`mailto:${r.email}`} className="underline underline-offset-2">
                            {r.email}
                          </a>
                        </td>
                        <td className="py-1.5 pr-3">
                          {r.phone ? (
                            <a href={`https://wa.me/${r.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                              {r.phone}
                            </a>
                          ) : (
                            '–'
                          )}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">{r.guests || 1}</td>
                        <td className="py-1.5 pl-2 text-right">
                          <button onClick={() => remove(r)} aria-label="Remove booking" className="text-muted-foreground hover:text-foreground">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
