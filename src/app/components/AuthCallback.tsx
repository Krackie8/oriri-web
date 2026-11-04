import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase/client';

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // With implicit flow, tokens are in the URL hash — Supabase detects them automatically.
    // Just wait briefly for onAuthStateChange to fire, then redirect home.
    const timer = setTimeout(() => {
      window.location.href = '/';
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        {error ? (
          <>
            <p className="text-destructive">Sign-in failed: {error}</p>
            <p className="text-muted-foreground text-sm">Redirecting you back...</p>
          </>
        ) : (
          <>
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Completing sign-in...</p>
          </>
        )}
      </div>
    </div>
  );
}
