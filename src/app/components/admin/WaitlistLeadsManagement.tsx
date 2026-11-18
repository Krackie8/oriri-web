/**
 * Admin › Sign-ups: the Wellness Bestie waitlist. One sign-up on /plan/day
 * unlocks the free day AND joins the waitlist, so this list merges the free
 * day leads with people from the old /pilot waitlist form (one row per email).
 *
 * Test leads are kept out of the count: some are spotted automatically (your
 * own email, example/test domains, "+" aliases of another sign-up, addresses
 * that can't receive mail) and any row can be marked "Test" or "Real" by hand.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useAuth } from '../../hooks/useAuth';
import * as wellnessApi from '../../utils/wellnessApi';
import { domainAcceptsMail } from '../../utils/emailCheck';

interface Lead {
  email: string;
  received_at: string;
  via: string[];
  instagram: string;
  heard_from: string;
  wb_source: string;
  utm_campaign: string;
  detail: string;
  first_name: string;
}

const TEST_DOMAINS = new Set(['example.com', 'example.org', 'example.net', 'test.com', 'test.org']);
const baseEmail = (e: string) => e.replace(/\+[^@]*@/, '@');
const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

function merge(freeDays: Record<string, string>[], pilot: Record<string, string>[]): Lead[] {
  const by = new Map<string, Lead>();
  const add = (r: Record<string, string>, via: string, detail: string) => {
    const email = String(r.email || '').trim().toLowerCase();
    if (!email) return;
    const at = r.received_at || r.submitted_at || '';
    const prev = by.get(email);
    if (!prev) {
      by.set(email, {
        email,
        received_at: at,
        via: [via],
        instagram: r.instagram || '',
        heard_from: r.heard_from || '',
        wb_source: r.wb_source || '',
        utm_campaign: r.utm_campaign || '',
        detail,
        first_name: r.first_name || '',
      });
      return;
    }
    if (!prev.via.includes(via)) prev.via.push(via);
    if (at && at < prev.received_at) prev.received_at = at; // first time they signed up
    prev.instagram ||= r.instagram || '';
    prev.heard_from ||= r.heard_from || '';
    prev.first_name ||= r.first_name || '';
    prev.detail ||= detail;
  };
  freeDays.forEach((r) =>
    add(r, 'Free day', [r.energy && `${r.energy} energy`, r.minutes && `${r.minutes} min`, r.budget && `AED ${r.budget}`, r.area].filter(Boolean).join(' · ')),
  );
  pilot.forEach((r) => add(r, 'Waitlist form', [r.home_area, r.age_group, r.workouts].filter(Boolean).join(' · ')));
  return [...by.values()].sort((a, b) => b.received_at.localeCompare(a.received_at));
}

export default function WaitlistLeadsManagement() {
  const { session } = useAuth();
  const me = (session?.user?.email || '').toLowerCase();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [flagsReady, setFlagsReady] = useState(true);
  const [noMail, setNoMail] = useState<Record<string, boolean>>({});
  const [showTests, setShowTests] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const latest = useRef(0);
  const load = useCallback(async () => {
    if (!session?.access_token) return;
    const id = ++latest.current;
    setLeads(null);
    setError('');
    const [fd, pa, fl] = await Promise.all([
      wellnessApi.getFreeDayLeads(session.access_token),
      wellnessApi.getPilotApplications(session.access_token),
      wellnessApi.getLeadFlags(session.access_token),
    ]);
    if (id !== latest.current) return;
    if (!fd.ok && !pa.ok) {
      setLeads([]);
      setError(fd.error || pa.error || 'Could not load the waitlist');
      return;
    }
    setLeads(merge(fd.data || [], pa.data || []));
    setFlagsReady(fl.ok);
    setFlags(Object.fromEntries((fl.data || []).map((f) => [f.email, f.test])));
  }, [session?.access_token]);

  useEffect(() => {
    load();
  }, [load]);

  // Check each domain can receive mail (catches made-up ones like g.com)
  useEffect(() => {
    if (!leads?.length) return;
    let live = true;
    const domains = [...new Set(leads.map((l) => l.email.split('@')[1]))];
    Promise.all(domains.map(async (d) => [d, !(await domainAcceptsMail(`x@${d}`))] as const)).then((rows) => {
      if (live) setNoMail(Object.fromEntries(rows));
    });
    return () => {
      live = false;
    };
  }, [leads]);

  /** Why a row looks like a test, or '' if it looks real. */
  const autoReason = useCallback(
    (l: Lead, all: Lead[]) => {
      const [local, domain] = l.email.split('@');
      if (me && baseEmail(l.email) === baseEmail(me)) return 'Your own email';
      if (TEST_DOMAINS.has(domain)) return 'Test domain';
      if (/test/.test(local)) return 'Says “test”';
      if (noMail[domain]) return 'Can’t receive mail';
      if (l.email !== baseEmail(l.email) && all.some((o) => o.email === baseEmail(l.email))) return '“+” copy of another sign-up';
      return '';
    },
    [me, noMail],
  );

  const rows = useMemo(
    () =>
      (leads || []).map((l) => {
        const auto = autoReason(l, leads || []);
        const manual = flags[l.email];
        const test = manual === undefined ? !!auto : manual;
        return { ...l, test, reason: manual === true ? 'Marked as test' : manual === false ? '' : auto, manual };
      }),
    [leads, flags, autoReason],
  );
  const real = rows.filter((r) => !r.test);
  const tests = rows.length - real.length;
  const shown = showTests ? rows : real;

  const bySource = useMemo(() => {
    const m: Record<string, number> = {};
    real.forEach((r) => {
      const k = r.wb_source || 'direct';
      m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [real]);

  const mark = async (email: string, test: boolean | null) => {
    setNote('');
    const res = await wellnessApi.setLeadFlag(session?.access_token, email, test);
    if (!res.ok) {
      setNote(flagsReady ? res.error || 'Could not save' : 'Marking tests needs the server update first.');
      return;
    }
    setFlags((f) => {
      const next = { ...f };
      if (test === null) delete next[email];
      else next[email] = test;
      return next;
    });
  };

  const exportCsv = () => {
    const cols: [keyof (typeof rows)[number], string][] = [
      ['received_at', 'Joined'],
      ['email', 'Email'],
      ['first_name', 'First name'],
      ['instagram', 'Instagram'],
      ['heard_from', 'Heard from'],
      ['wb_source', 'Source'],
      ['utm_campaign', 'Campaign'],
      ['detail', 'Details'],
    ];
    const lines = [[...cols.map((c) => c[1]), 'Signed up via'], ...real.map((r) => [...cols.map((c) => r[c[0]]), r.via.join(' + ')])];
    const blob = new Blob([lines.map((l) => l.map(csvCell).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'wellness-bestie-waitlist.csv';
    a.click();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Wellness Bestie waitlist ({leads ? real.length : '…'})</CardTitle>
          <CardDescription>
            Everyone who signed up. Getting the free day joins the waitlist, so free day leads count here too. Tests are left out of the count.
          </CardDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={load} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!real.length}>
            <Download className="mr-1 h-4 w-4" /> CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {bySource.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {bySource.map(([src, n]) => (
              <span key={src} className="rounded-full border border-border px-3 py-1 text-xs">
                {src}: {n}
              </span>
            ))}
          </div>
        )}
        {tests > 0 && (
          <button type="button" onClick={() => setShowTests((v) => !v)} className="text-sm underline underline-offset-4">
            {showTests ? 'Hide' : 'Show'} {tests} test {tests === 1 ? 'lead' : 'leads'}
          </button>
        )}
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
        {leads === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : !shown.length ? (
          <p className="text-sm text-muted-foreground">No sign-ups yet.</p>
        ) : (
          shown.map((r) => (
            <div key={r.email} className={`rounded-lg border border-border p-3 text-sm ${r.test ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {r.first_name ? `${r.first_name} · ` : ''}
                    {r.email}
                    {r.instagram ? ` · @${r.instagram}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[r.via.join(' + '), r.heard_from && `heard via ${r.heard_from}`, r.wb_source, r.received_at.slice(0, 10)].filter(Boolean).join(' · ')}
                  </p>
                  {r.detail && <p className="mt-0.5 text-xs text-muted-foreground">{r.detail}</p>}
                  {r.test && r.reason && <span className="mt-1.5 inline-block rounded-full bg-muted px-2 py-0.5 text-xs">Test: {r.reason}</span>}
                </div>
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => mark(r.email, r.test ? (r.manual === true ? null : false) : true)}>
                  {r.test ? 'Not a test' : 'Mark test'}
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
