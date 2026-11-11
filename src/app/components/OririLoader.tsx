import React from 'react';

/**
 * The one ORIRI loading look: the espresso Bodoni O on cream that grows and
 * rises into place (same as the first-load screen in index.html), then
 * breathes gently while we wait. Use it for every loading state.
 *
 * - variant="screen": covers the whole viewport (app start, sign-in)
 * - variant="page": fills a page's space (route / page data loading)
 * - variant="inline": smaller, no background (a section or modal loading)
 */
export default function OririLoader({
  variant = 'page',
  label,
  className = '',
}: {
  variant?: 'screen' | 'page' | 'inline';
  label?: string;
  className?: string;
}) {
  const size = variant === 'inline' ? 56 : 128;
  return (
    <div
      className={`oriri-loader oriri-loader--${variant} ${className}`}
      role="status"
      aria-live="polite"
    >
      <img
        src="/icon-512.png"
        alt=""
        width={size}
        height={size}
        className="oriri-loader__o"
        style={{ width: size, height: size }}
      />
      <span className={label ? 'oriri-loader__label' : 'sr-only'}>{label || 'Loading'}</span>
    </div>
  );
}
