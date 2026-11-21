/**
 * "Share or save" for a Status moment: the image is made on her phone, and only she decides where it goes.
 * The share carries a link to join Bestie (SHARE_LINK), which names nothing of hers.
 */
import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import type { PillarNumbers } from '../functionClient';
import { PillButton } from '../bestie/kit';
import { track } from '../analytics/track';
import { shareOrSave, statusImage } from './shareCard';
import { SHARE_LINK, shareText } from './progressView';

export function ShareStatus({ name, levels, className }: { name: string; levels: PillarNumbers; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const text = shareText(name);
  const go = async () => {
    setBusy(true);
    setNote(null);
    setSaved(false);
    const blob = await statusImage(name, levels).catch(() => null);
    const r = blob ? await shareOrSave(blob, text).catch(() => null) : null;
    setBusy(false);
    if (!r) return setNote('Bestie could not make the image right now.');
    if (r === 'saved') setSaved(true);
    track('status_share', { how: r });
  };
  const copy = async () => {
    const ok = await navigator.clipboard?.writeText(text).then(() => true, () => false);
    setNote(ok ? 'Copied. Paste it with your image.' : `Add this link when you share it: ${SHARE_LINK}`);
    track('status_share_copy', { ok: !!ok });
  };
  return (
    <div className={className}>
      <PillButton onClick={go} disabled={busy} tone="outline" size="md">
        <Share2 className="h-4 w-4" strokeWidth={1.6} aria-hidden /> {busy ? 'Making your image…' : 'Share or save'}
      </PillButton>
      <p className="mt-2 text-[13px] text-wb-taupe">
        Your Status, the shape of your chart and a link to try Bestie. Your Levels stay private.
      </p>
      {saved && (
        <p className="mt-1 text-[13px] text-wb-taupe" role="status">
          Saved to your downloads.{' '}
          <button type="button" onClick={copy} className="text-wb-plum underline underline-offset-4">
            Copy the invite text
          </button>{' '}
          to share with it.
        </p>
      )}
      {note && (
        <p className="mt-1 break-words text-[13px] text-wb-taupe" role="status">
          {note}
        </p>
      )}
    </div>
  );
}
