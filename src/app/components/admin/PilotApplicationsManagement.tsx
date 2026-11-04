import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Download, RefreshCw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import * as wellnessApi from '../../utils/wellnessApi';

const COLUMNS = [
  'submitted_at', 'first_name', 'home_area', 'age_group', 'workouts', 'meal_prefs', 'mindset_prefs', 'email', 'instagram', 'whatsapp', 'heard_from',
  'wb_source', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'landing_page', 'referrer', 'first_touch_source', 'first_touch_medium', 'first_touch_campaign',
];
const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** Admin → Sign-ups: Wellness Bestie founding pilot applications with their traffic source. */
export default function PilotApplicationsManagement() {
  const { session } = useAuth();
  const [rows, setRows] = useState<wellnessApi.PilotApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await wellnessApi.getPilotApplications(session?.access_token);
    setRows(res.ok && res.data ? res.data : []);
    setLoading(false);
  }, [session?.access_token]);

  useEffect(() => { load(); }, [load]);

  const bySource = useMemo(() => {
    const m: Record<string, number> = {};
    rows.forEach((r) => { m[r.wb_source || 'direct'] = (m[r.wb_source || 'direct'] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const exportCsv = () => {
    const lines = [COLUMNS, ...rows.map((r) => COLUMNS.map((c) => r[c]))];
    const blob = new Blob([lines.map((l) => l.map(csvCell).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'wellness-bestie-pilot-applications.csv';
    a.click();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Wellness Bestie waitlist ({rows.length})</CardTitle>
          <CardDescription>From /pilot, with UTM source on every row.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}><Download className="mr-1 h-4 w-4" /> CSV</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {bySource.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {bySource.map(([src, n]) => (
              <span key={src} className="rounded-full border border-border px-3 py-1 text-xs">{src}: {n}</span>
            ))}
          </div>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !rows.length ? (
          <p className="text-sm text-muted-foreground">No applications yet. (Publish/sync the server if you just added /pilot.)</p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{r.first_name} · {r.email || r.whatsapp}{r.instagram ? ` · @${r.instagram}` : ''}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{r.submitted_at?.slice(0, 16).replace('T', ' ')}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {r.home_area} · {r.age_group} · {r.workouts} · heard via {r.heard_from}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Source: <strong>{r.wb_source}</strong>{r.utm_medium ? ` (${r.utm_source}/${r.utm_medium}/${r.utm_campaign})` : ''} · landed on {r.landing_page}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
