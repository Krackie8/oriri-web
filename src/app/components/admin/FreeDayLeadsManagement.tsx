/** Admin › Sign-ups: free trial leads (email given before the plan shows on /plan/day). */
import React, { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useAuth } from '../../hooks/useAuth';
import * as wellnessApi from '../../utils/wellnessApi';
import type { FreeDayLead } from '../../utils/wellnessApi';

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const COLS: [string, string][] = [
  ['received_at', 'Received'],
  ['email', 'Email'],
  ['energy', 'Energy'],
  ['goals', 'Goals'],
  ['minutes', 'Minutes'],
  ['budget', 'Budget'],
  ['area', 'Area'],
  ['plan', 'Plan'],
  ['wb_source', 'Source'],
  ['utm_campaign', 'Campaign'],
];

export default function FreeDayLeadsManagement() {
  const { session } = useAuth();
  const [rows, setRows] = useState<FreeDayLead[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setRows(null);
    setError('');
    const res = await wellnessApi.getFreeDayLeads(session?.access_token);
    if (res.ok && res.data) setRows(res.data);
    else {
      setRows([]);
      setError(res.error || 'Could not load free trial leads');
    }
  }, [session?.access_token]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = () => {
    const lines = [COLS.map((c) => c[1]), ...(rows || []).map((r) => COLS.map((c) => r[c[0]]))];
    const blob = new Blob([lines.map((l) => l.map(csvCell).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'free-trial-leads.csv';
    a.click();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Free trial leads ({rows?.length ?? '…'})</CardTitle>
          <CardDescription>People who checked in and gave their email to see their free day.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows?.length}>
            <Download className="mr-1 h-4 w-4" /> CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : !rows.length ? (
          <p className="text-sm text-muted-foreground">No free trial leads yet.</p>
        ) : (
          rows.map((r) => (
            <div key={r.email} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
              <span className="truncate font-medium">{r.email}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {[r.energy && `${r.energy} energy`, r.minutes && `${r.minutes} min`, r.budget && `AED ${r.budget}`, r.wb_source].filter(Boolean).join(' · ')} · {String(r.received_at || '').slice(0, 10)}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
