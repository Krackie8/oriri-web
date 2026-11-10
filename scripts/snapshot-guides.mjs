// Saves the directory list into public/data/guides.json before the build, so the
// site can show it from its own domain if the live API can't be reached.
// Never fails the build: on any error it leaves no file and the site uses the live API.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';

const info = readFileSync(new URL('../src/app/utils/supabase/info.tsx', import.meta.url), 'utf8');
const projectId = info.match(/projectId\s*=\s*["']([^"']+)/)?.[1];
const anonKey = info.match(/publicAnonKey\s*=\s*["']([^"']+)/)?.[1];
try {
  if (!projectId || !anonKey) throw new Error('Supabase info not found');
  const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/wellness/guides`, {
    headers: { Authorization: `Bearer ${anonKey}` },
  });
  const json = await res.json();
  if (!res.ok || !Array.isArray(json?.data)) throw new Error(`HTTP ${res.status}`);
  const data = json.data.filter((g) => !g.hidden);
  mkdirSync(new URL('../public/data/', import.meta.url), { recursive: true });
  writeFileSync(new URL('../public/data/guides.json', import.meta.url), JSON.stringify({ savedAt: new Date().toISOString(), data }));
  console.log(`Saved ${data.length} directory places to public/data/guides.json`);
} catch (e) {
  console.warn(`Directory snapshot skipped: ${e.message}`);
}
