/** Her Profile's spider chart (#73): Levels now (filled) over her Levels 30 days ago (outline). */
import React from 'react';
import type { PillarNumbers } from '../functionClient';
import { CHART_AXES, PILLAR_LABEL, chartPoints } from './progressView';

const R = 100;
const PAD = 44;
const ring = (v: number): PillarNumbers => ({ move: v, meal: v, mindset: v, meet_up: v });

export function SpiderChart({ levels, levels30, className }: { levels: PillarNumbers; levels30?: PillarNumbers; className?: string }) {
  const label = CHART_AXES.map((p) => `${PILLAR_LABEL[p]} Level ${levels[p]}`).join(', ');
  const labelAt = (i: number) => {
    const ang = -Math.PI / 2 + (i * Math.PI) / 2;
    return { x: R + (R + 22) * Math.cos(ang), y: R + (R + 22) * Math.sin(ang) + 5 };
  };
  return (
    <svg viewBox={`${-PAD} ${-PAD} ${2 * R + 2 * PAD} ${2 * R + 2 * PAD}`} role="img" aria-label={`Your Levels: ${label}`} className={className}>
      {[2, 4, 6, 8, 10].map((v) => (
        <polygon key={v} points={chartPoints(ring(v), R)} className="fill-none stroke-wb-sand" strokeWidth={1} />
      ))}
      {CHART_AXES.map((p, i) => {
        const [x, y] = chartPoints(ring(10), R).split(' ')[i].split(',');
        return <line key={p} x1={R} y1={R} x2={x} y2={y} className="stroke-wb-sand" strokeWidth={1} />;
      })}
      <polygon points={chartPoints(levels, R)} className="fill-wb-sage/40 stroke-wb-sage-deep" strokeWidth={2} strokeLinejoin="round" />
      {levels30 && (
        <polygon points={chartPoints(levels30, R)} className="fill-none stroke-wb-ink" strokeWidth={1.5} strokeDasharray="4 4" strokeLinejoin="round" />
      )}
      {CHART_AXES.map((p, i) => {
        const { x, y } = labelAt(i);
        return (
          <text key={p} x={x} y={y} textAnchor="middle" className="fill-wb-soft" style={{ fontSize: 13 }}>
            {PILLAR_LABEL[p]}
          </text>
        );
      })}
    </svg>
  );
}
