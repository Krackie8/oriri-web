/**
 * Email checks for sign-up and lead forms: strict format, common typo
 * suggestions (gmial.com → gmail.com) and throwaway inboxes blocked.
 */
const POPULAR = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'live.com', 'me.com', 'msn.com', 'aol.com', 'protonmail.com', 'proton.me', 'googlemail.com', 'yahoo.co.uk', 'hotmail.co.uk', 'outlook.ae'];

const DISPOSABLE = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'sharklasers.com', 'grr.la', '10minutemail.com', '10minutemail.net',
  'tempmail.com', 'temp-mail.org', 'temp-mail.io', 'tempmail.net', 'tempmailo.com', 'tempr.email', 'yopmail.com', 'yopmail.net',
  'trashmail.com', 'trashmail.de', 'getnada.com', 'nada.email', 'dispostable.com', 'maildrop.cc', 'throwawaymail.com',
  'fakeinbox.com', 'mohmal.com', 'emailondeck.com', 'mintemail.com', 'mailnesia.com', 'mytemp.email', 'spamgourmet.com',
  'burnermail.io', 'moakt.com', 'tmail.ws', 'tmpmail.org', 'tmpmail.net', 'discard.email', 'inboxkitten.com', 'mailpoof.com',
  'example.com', 'example.org', 'example.net', 'test.com', 'test.org',
]);

const FORMAT = /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

export interface EmailCheck {
  ok: boolean;
  email: string;
  error?: string;
  /** A likely-correct address when the domain looks like a typo. */
  suggestion?: string;
}

export function checkEmail(raw: string): EmailCheck {
  const email = raw.trim().toLowerCase();
  if (!email) return { ok: false, email, error: 'Please enter your email address.' };
  if (email.length > 160 || !FORMAT.test(email) || email.includes('..')) return { ok: false, email, error: 'Please check your email address.' };
  const [local, domain] = email.split('@');
  if (DISPOSABLE.has(domain)) return { ok: false, email, error: 'Please use your own email address, not a temporary one.' };
  // Very short names (g.com) are too far from any real provider to guess; the mail-server check handles them.
  if (!POPULAR.includes(domain) && domain.split('.')[0].length >= 3) {
    let best = '';
    let bestD = 3;
    for (const p of POPULAR) {
      const dd = distance(domain, p);
      if (dd < bestD) {
        bestD = dd;
        best = p;
      }
    }
    // Catch gmail.co / gmail.con style endings too
    const base = domain.replace(/\.(co|con|cm|cmo|om|comm|vom|xom)$/, '.com');
    if (base !== domain && POPULAR.includes(base)) best = base;
    if (best && (bestD <= 2 || best === base)) {
      const suggestion = `${local}@${best}`;
      return { ok: false, email, error: `Did you mean ${suggestion}?`, suggestion };
    }
  }
  return { ok: true, email };
}

const domainCache = new Map<string, boolean>();

/**
 * Does this email's domain accept mail? Looks up its mail server (MX) over
 * DNS-over-HTTPS. Made-up domains like "g.com" or "example.com" fail. If the
 * lookup itself can't be done (offline, slow), it answers true so a real
 * visitor is never blocked by our check. The server checks again.
 */
export async function domainAcceptsMail(email: string): Promise<boolean> {
  const domain = email.trim().toLowerCase().split('@')[1] || '';
  if (!domain) return false;
  if (POPULAR.includes(domain)) return true;
  if (domainCache.has(domain)) return domainCache.get(domain)!;
  const ask = async (type: 'MX' | 'A') => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    try {
      const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`, { signal: ctrl.signal });
      return (await r.json()) as { Status: number; Answer?: { type: number; data: string }[] };
    } finally {
      clearTimeout(t);
    }
  };
  try {
    const mx = await ask('MX');
    let ok: boolean;
    if (mx.Status === 3) ok = false; // domain doesn't exist
    else {
      const rows = (mx.Answer || []).filter((a) => a.type === 15);
      if (rows.length) ok = !rows.every((a) => /^\d+\s+\.?$/.test(a.data.trim())); // "0 ." = domain says it takes no mail
      else ok = ((await ask('A')).Answer || []).some((a) => a.type === 1); // no MX: mail goes to the domain itself
    }
    domainCache.set(domain, ok);
    return ok;
  } catch {
    return true;
  }
}

export const NO_MAIL_ERROR = 'That email address can’t receive mail. Please check it.';
