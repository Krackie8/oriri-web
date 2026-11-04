import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// One Supabase client per browser tab. Cached on globalThis so hot reloads
// reuse it instead of creating a second GoTrueClient on the same storage key.
const g = globalThis as typeof globalThis & { __oririSupabase?: SupabaseClient };

export const supabase: SupabaseClient =
  g.__oririSupabase ?? (g.__oririSupabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey));
