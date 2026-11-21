/**
 * The share-or-save image for a Status (#73, DEC-011 Q10): her Status name and the chart's shape, with no
 * numbers. Drawn in the browser; nothing is uploaded or stored, and nothing becomes public unless she sends it.
 */
import type { PillarNumbers } from '../functionClient';
import { CHART_AXES, PILLAR_LABEL, chartPoints, shareMethod, withArticle } from './progressView';

// Canvas cannot read CSS variables cheaply; these mirror the wb-* tokens in src/styles/wellness.css.
const PAPER = '#FAF8F5';
const INK = '#2B2522';
const TAUPE = '#7D6D61';
const SAGE = '#B8A291';
const SAND = '#DDD4CD';

export async function statusImage(statusName: string, levels: PillarNumbers): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  if (!g) return null;
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  g.textAlign = 'center';
  g.fillStyle = TAUPE;
  g.font = '500 34px Figtree, system-ui, sans-serif';
  g.fillText('ORIRI', W / 2, 140);
  g.font = '400 40px Figtree, system-ui, sans-serif';
  g.fillText(withArticle(statusName).startsWith('an ') ? 'I’m now an' : 'I’m now a', W / 2, 260);
  g.fillStyle = INK;
  g.font = '600 84px "Red Hat Display", Figtree, system-ui, sans-serif';
  g.fillText(statusName, W / 2, 360, W - 120);

  const r = 300;
  const ox = W / 2 - r;
  const oy = 520;
  const poly = (pts: string, fill: string | null, stroke: string, width: number) => {
    g.beginPath();
    pts.split(' ').forEach((pt, i) => {
      const [x, y] = pt.split(',').map(Number);
      if (i === 0) g.moveTo(ox + x, oy + y);
      else g.lineTo(ox + x, oy + y);
    });
    g.closePath();
    if (fill) {
      g.fillStyle = fill;
      g.fill();
    }
    g.strokeStyle = stroke;
    g.lineWidth = width;
    g.stroke();
  };
  for (const v of [2, 4, 6, 8, 10]) poly(chartPoints({ move: v, meal: v, mindset: v, meet_up: v }, r), null, SAND, 2);
  poly(chartPoints(levels, r), 'rgba(184,162,145,0.45)', SAGE, 5);
  g.fillStyle = TAUPE;
  g.font = '400 34px Figtree, system-ui, sans-serif';
  CHART_AXES.forEach((p, i) => {
    const ang = -Math.PI / 2 + (i * Math.PI) / 2;
    g.fillText(PILLAR_LABEL[p], W / 2 + (r + 70) * Math.cos(ang), oy + r + (r + 50) * Math.sin(ang) + 12);
  });
  // Some apps drop the text sent with an image, so the image carries the way in too.
  g.fillStyle = INK;
  g.font = '500 36px Figtree, system-ui, sans-serif';
  g.fillText('Try Bestie free · oriri.me/bestie', W / 2, H - 70);
  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

/** Opens the phone's share sheet with the image and `text` (which carries the join link), or downloads the image. */
export async function shareOrSave(blob: Blob, text: string): Promise<'shared' | 'saved' | 'cancelled'> {
  const file = new File([blob], 'oriri-status.png', { type: 'image/png' });
  if (shareMethod(navigator as never) === 'share') {
    try {
      await navigator.share({ files: [file], title: 'My Oriri Status', text });
      return 'shared';
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'oriri-status.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'saved';
}
