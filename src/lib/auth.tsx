// LUVR — auth + profile context.
// Single source of truth for the signed-in user, their profile, and the
// resulting app status used by the launch routing guards.
//
//   loading        -> still resolving session/profile (show splash)
//   signedOut      -> no user (onboarding from the account step)
//   needsOnboarding-> signed in but onboarding_complete is false (profile steps)
//   ready          -> signed in and fully onboarded (tabbed app)

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { supabase } from '@/lib/supabaseClient';
import { Profile } from '@/lib/types';

export type AuthStatus = 'loading' | 'signedOut' | 'needsOnboarding' | 'ready';

type AuthValue = {
  status: AuthStatus;
  profile: Profile | null;
  email: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const PROFILE_COLUMNS =
  'id,display_name,gender,attracted_to,writing_style,onboarding_complete,is_premium';

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      setProfile(null);
      setEmail(null);
      setStatus('signedOut');
      return;
    }
    setEmail(user.email ?? null);
    const { data: prof } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', user.id)
      .maybeSingle();
    const p = (prof as Profile) ?? null;
    setProfile(p);
    setStatus(p?.onboarding_complete ? 'ready' : 'needsOnboarding');
  }, []);

  useEffect(() => {
    refresh();
    // Only react to sign-out here; the onboarding flow drives its own forward
    // progression and calls refresh() on completion.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setProfile(null);
        setEmail(null);
        setStatus('signedOut');
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // The onAuthStateChange listener flips status to signedOut.
  }, []);

  return (
    <AuthContext.Provider value={{ status, profile, email, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
