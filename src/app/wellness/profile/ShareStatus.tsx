/** "Share or save" for a Status moment: the image is made on her phone, and only she decides where it goes. */
import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import type { PillarNumbers } from '../functionClient';
import { PillButton } from '../bestie/kit';
import { track } from '../analytics/track';
import { shareOrSave, statusImage } from './shareCard';

export function ShareStatus({ name, levels, className }: { name: string; levels: PillarNumbers; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const go = async () => {
    setBusy(true);
    setNote(null);
    const blob = await statusImage(name, levels).catch(() => null);
    const r = blob ? await shareOrSave(blob).catch(() => null) : null;
    setBusy(false);
    if (!r) return setNote('Bestie could not make the image right now.');
    if (r === 'saved') setNote('Saved to your downloads.');
    track('status_share', { how: r });
  };
  return (
    <div className={className}>
      <PillButton onClick={go} disabled={busy} tone="outline" size="md">
        <Share2 className="h-4 w-4" strokeWidth={1.6} aria-hidden /> {busy ? 'Making your image…' : 'Share or save'}
      </PillButton>
      <p className="mt-2 text-[13px] text-wb-taupe">Only your Status and the shape of your chart. Your Levels stay private.</p>
      {note && (
        <p className="mt-1 text-[13px] text-wb-taupe" role="status">
          {note}
        </p>
      )}
    </div>
  );
}
