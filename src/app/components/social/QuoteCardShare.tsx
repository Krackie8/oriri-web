import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Download, Share2, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface QuoteCardShareProps {
  isOpen: boolean;
  onClose: () => void;
  episodeTitle: string;
  url: string;
  /** Optional pre-filled pull quote. Defaults to the episode title. */
  defaultQuote?: string;
  /** Called after a successful share/download so callers can log analytics. */
  onShared?: (method: 'native' | 'download') => void;
}

const CARD_W = 1080;
const CARD_H = 1350;

/** Greedy word wrap against the canvas' current font. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';

  for (const word of text.trim().split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawCard(canvas: HTMLCanvasElement, quote: string, episodeTitle: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = CARD_W;
  canvas.height = CARD_H;

  // Background — the Oriri sage gradient
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, '#2A3323');
  bg.addColorStop(0.55, '#1A1F16');
  bg.addColorStop(1, '#14140F');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Soft sage glow
  const glow = ctx.createRadialGradient(CARD_W * 0.8, 180, 0, CARD_W * 0.8, 180, 620);
  glow.addColorStop(0, 'rgba(122, 140, 110, 0.35)');
  glow.addColorStop(1, 'rgba(122, 140, 110, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const margin = 110;
  const maxWidth = CARD_W - margin * 2;

  // Wordmark
  ctx.fillStyle = '#FAF7F2';
  ctx.font = '600 56px "Cormorant Garamond", Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('Oriri', margin, 150);

  ctx.fillStyle = 'rgba(250, 247, 242, 0.55)';
  ctx.font = '400 28px "DM Sans", system-ui, sans-serif';
  ctx.fillText('Tea for Two', margin, 196);

  // Opening quotation mark
  ctx.fillStyle = 'rgba(122, 140, 110, 0.6)';
  ctx.font = '600 200px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('“', margin - 14, 420);

  // Quote body — shrink the type until it fits the available height
  const bodyTop = 470;
  const bodyBottom = CARD_H - 300;
  let fontSize = 78;
  let lines: string[] = [];

  while (fontSize > 34) {
    ctx.font = `500 ${fontSize}px "Cormorant Garamond", Georgia, serif`;
    lines = wrapLines(ctx, quote, maxWidth);
    if (lines.length * fontSize * 1.3 <= bodyBottom - bodyTop) break;
    fontSize -= 4;
  }

  ctx.fillStyle = '#FAF7F2';
  ctx.font = `500 ${fontSize}px "Cormorant Garamond", Georgia, serif`;
  lines.forEach((line, i) => {
    ctx.fillText(line, margin, bodyTop + fontSize + i * fontSize * 1.3);
  });

  // Divider
  ctx.strokeStyle = 'rgba(250, 247, 242, 0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, CARD_H - 250);
  ctx.lineTo(margin + 140, CARD_H - 250);
  ctx.stroke();

  // Episode attribution (single line, truncated)
  ctx.fillStyle = 'rgba(250, 247, 242, 0.7)';
  ctx.font = '400 32px "DM Sans", system-ui, sans-serif';
  let attribution = episodeTitle;
  while (ctx.measureText(attribution).width > maxWidth && attribution.length > 4) {
    attribution = attribution.slice(0, -2);
  }
  if (attribution !== episodeTitle) attribution = `${attribution.trimEnd()}…`;
  ctx.fillText(attribution, margin, CARD_H - 190);

  // Footer
  ctx.fillStyle = 'rgba(250, 247, 242, 0.45)';
  ctx.font = '500 30px "DM Sans", system-ui, sans-serif';
  ctx.fillText('oriri.me', margin, CARD_H - 110);
}

/**
 * Branded 1080×1350 quote card, drawn on a raw HTML canvas (konva is not
 * supported in this environment). Shares via the native sheet on mobile and
 * falls back to a PNG download on desktop.
 */
export function QuoteCardShare({
  isOpen,
  onClose,
  episodeTitle,
  url,
  defaultQuote,
  onShared,
}: QuoteCardShareProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [quote, setQuote] = useState(defaultQuote || episodeTitle);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) setQuote(defaultQuote || episodeTitle);
  }, [isOpen, defaultQuote, episodeTitle]);

  // Redraw whenever the text changes.
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    drawCard(canvasRef.current, quote.trim() || episodeTitle, episodeTitle);
  }, [isOpen, quote, episodeTitle]);

  const caption = `${quote.trim() || episodeTitle}\n\nFrom "${episodeTitle}" on Tea for Two.\nListen: ${url}\n\n#Oriri #TeaForTwo #UAE #PersonalGrowth #Wellness`;

  const toBlob = useCallback(
    () =>
      new Promise<Blob | null>((resolve) => {
        const canvas = canvasRef.current;
        if (!canvas) return resolve(null);
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      }),
    [],
  );

  const download = (blob: Blob) => {
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = 'oriri-quote.png';
    a.click();
    URL.revokeObjectURL(href);
  };

  const handleShare = async () => {
    setBusy(true);
    try {
      const blob = await toBlob();
      if (!blob) {
        toast.error('Could not render the quote card');
        return;
      }

      const file = new File([blob], 'oriri-quote.png', { type: 'image/png' });
      const canShareFiles =
        typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

      if (canShareFiles) {
        await navigator.share({ files: [file], title: episodeTitle, text: caption });
        onShared?.('native');
        toast.success('Shared');
      } else {
        download(blob);
        onShared?.('download');
        toast.success('Quote card downloaded');
      }
    } catch (error: any) {
      // AbortError just means the user dismissed the share sheet.
      if (error?.name !== 'AbortError') {
        console.error('[QuoteCardShare] Share failed:', error?.message ?? error);
        toast.error('Could not share the quote card');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    setBusy(true);
    try {
      const blob = await toBlob();
      if (!blob) {
        toast.error('Could not render the quote card');
        return;
      }
      download(blob);
      onShared?.('download');
      toast.success('Quote card downloaded');
    } finally {
      setBusy(false);
    }
  };

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      toast.success('Caption copied');
    } catch {
      toast.error('Could not copy the caption');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share as image</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <canvas
            ref={canvasRef}
            className="mx-auto w-full max-w-[260px] rounded-xl border border-border/60"
            style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}
          />

          <div>
            <label htmlFor="quote-text" className="mb-1 block text-xs text-muted-foreground">
              Pull quote
            </label>
            <Textarea
              id="quote-text"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              rows={3}
              maxLength={220}
              placeholder="Paste the line that hit hardest…"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{quote.length}/220</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleShare} disabled={busy} className="w-full">
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="mr-2 h-4 w-4" />
              )}
              Share
            </Button>
            <Button variant="outline" onClick={handleDownload} disabled={busy} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>

          <Button variant="ghost" onClick={handleCopyCaption} className="w-full">
            <Copy className="mr-2 h-4 w-4" />
            Copy caption
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default QuoteCardShare;
