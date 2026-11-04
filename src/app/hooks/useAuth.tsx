import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import type { AuthError, Session, User } from '@supabase/supabase-js';


export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      setSession(session ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      setSession(session ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      console.log('[useAuth] Attempting to sign in with:', email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error('[useAuth] Sign in error:', error);

        if (error.message === 'Email not confirmed' && email === 'admin@oriri.com') {
          console.log('[useAuth] Admin user email not confirmed, attempting admin setup...');

          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const adminResponse = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32/setup-admin`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${publicAnonKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
                signal: controller.signal,
              }
            );

            clearTimeout(timeoutId);

            if (adminResponse.ok) {
              console.log('[useAuth] Admin setup result:', await adminResponse.json());
              await new Promise(resolve => setTimeout(resolve, 1000));

              const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({ email, password });
              if (!retryError) {
                console.log('[useAuth] Sign in successful after admin setup');
                return { data: retryData, error: null };
              }
            }
          } catch (setupError) {
            console.log('[useAuth] Admin setup failed or timed out:', setupError);
          }

          return { data, error };
        }
      } else {
        console.log('[useAuth] Sign in successful:', data.user?.id, data.user?.email);
      }

      return { data, error };
    } catch (err) {
      console.error('[useAuth] Unexpected sign in error:', err);
      return { data: null, error: err as AuthError };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      console.log('Attempting to sign up with:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: email.split('@')[0] } },
      });

      if (error) {
        console.error('Sign up error:', error);
      } else {
        console.log('Sign up successful:', data.user?.id);
      }

      return { data, error };
    } catch (err) {
      console.error('Unexpected sign up error:', err);
      return { data: null, error: err as AuthError };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      console.log('[useAuth] Signing out...');

      // VIP trial data is intentionally preserved across sessions —
      // access control is enforced by checking isLoggedIn at runtime.
      const { error } = await supabase.auth.signOut();

      if (!error) {
        console.log('[useAuth] Successfully signed out - VIP trial data preserved');
      }

      return { error };
    } catch (err) {
      console.error('Sign out error:', err);
      return { error: err as AuthError };
    }
  }, []);

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isLoggedIn: !!user,
  };
}
