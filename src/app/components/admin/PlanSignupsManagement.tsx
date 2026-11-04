import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Download, RefreshCw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import * as wellnessApi from '../../utils/wellnessApi';
import type { PlanSignup } from '../../utils/wellnessApi';
import * as nourishApi from '../../utils/nourishApi';

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export default function PlanSignupsManagement({ source = 'plan' }: { source?: 'plan' | 'nourish' }) {
  const isNourish = source === 'nourish';
  const { session } = useAuth();
  const [rows, setRows] = useState<PlanSignup[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = isNourish ? await nourishApi.getLeads(session?.access_token) : await wellnessApi.getPlanSignups(session?.access_token);
    setRows(res.ok && res.data ? (res.data as PlanSignup[]) : []);
    setLoading(false);
  }, [session?.access_token, isNourish]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    const lines = isNourish
      ? [['Email', 'Goal', 'Signed up'], ...rows.map((r: any) => [r.email, r.goalLabel, r.createdAt])]
      : [['Email', 'Feeling', 'Energy', 'Sharpest time', 'Signed up'], ...rows.map((r) => [r.email, r.feeling, r.energy, r.sharpest, r.createdAt])];
    const blob = new Blob([lines.map((l) => l.map(csvCell).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = isNourish ? 'nourish-signups.csv' : 'plan-my-day-signups.csv';
    a.click();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{isNourish ? 'Nourish' : 'Plan my day'} sign-ups ({rows.length})</CardTitle>
          <CardDescription>{isNourish ? 'People who saved their Nourish plan by email.' : 'People who kept their spot on /plan.'}</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}><Download className="mr-1 h-4 w-4" /> CSV</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !rows.length ? (
          <p className="text-sm text-muted-foreground">No sign-ups yet.</p>
        ) : (
          rows.map((r) => (
            <div key={r.email} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
              <span className="truncate font-medium">{r.email}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {isNourish ? (r as any).goalLabel : `${r.feeling} · ${r.energy}/10 · ${r.sharpest}`} · {r.createdAt?.slice(0, 10)}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
