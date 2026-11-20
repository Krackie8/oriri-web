/** Loads who is looking at the planner (see returning.ts for where she goes). */
import { useEffect, useState } from 'react';
import { functionClient } from '../functionClient';
import { supabase } from '../../utils/supabase/client';
import type { Viewer } from './returning';

async function loadViewer(): Promise<Viewer> {
  const session = await supabase.auth.getSession().then(({ data }) => data.session).catch(() => null);
  if (!session) return { kind: 'visitor' };
  const me = await functionClient.member.me();
  if (!me.ok || me.data.outcome !== 'member') return { kind: 'visitor' };
  const today = await functionClient.bestie.today();
  if (!today.ok) return { kind: 'visitor' };
  return { kind: 'member', plan: today.data.outcome === 'planned' ? today.data.plan : null };
}

/** `checking` while a signed-in woman's status and today's plan load. Pass `skip` to not look at all. */
export function useViewer(skip = false): Viewer {
  const [viewer, setViewer] = useState<Viewer>(skip ? { kind: 'visitor' } : { kind: 'checking' });
  useEffect(() => {
    if (skip) return;
    let live = true;
    loadViewer()
      .catch(() => ({ kind: 'visitor' }) as Viewer)
      .then((v) => live && setViewer(v));
    return () => {
      live = false;
    };
  }, [skip]);
  return viewer;
}

