// LUVR — app root / launch router.
// On launch: check the Supabase session and the user's profile, then route:
//   - no signed-in user            -> onboarding from the account step
//   - signed in, onboarding false  -> onboarding from the profile steps
//   - signed in, onboarding true   -> the story experience (setup -> reader)
// Sign-out (from anywhere) returns to onboarding.

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import ScreenBackground from '@/components/ScreenBackground';
import { supabase } from '@/lib/supabaseClient';
import { theme } from '@/lib/theme';
import { Profile, StoryParams } from '@/lib/types';
import InsightsScreen from '@/screens/InsightsScreen';
import OnboardingScreen from '@/screens/OnboardingScreen';
import StoryReaderScreen from '@/screens/StoryReaderScreen';
import StorySetupScreen from '@/screens/StorySetupScreen';

type Route = 'boot' | 'onboarding' | 'story';

const PROFILE_COLUMNS =
  'id,display_name,gender,attracted_to,writing_style,onboarding_complete';

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();
  return (data as Profile) ?? null;
}

export default function AppRoot() {
  const [route, setRoute] = useState<Route>('boot');
  const [onboardingStart, setOnboardingStart] = useState<0 | 1>(0);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Within the story experience: the active story (null => show setup) and
  // whether the insights overlay is open.
  const [activeStory, setActiveStory] = useState<StoryParams | null>(null);
  const [showInsights, setShowInsights] = useState(false);

  const evaluate = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id ?? null;
    if (!uid) {
      setProfile(null);
      setOnboardingStart(0);
      setRoute('onboarding');
      return;
    }
    const prof = await fetchProfile(uid);
    if (prof?.onboarding_complete) {
      setProfile(prof);
      setActiveStory(null);
      setShowInsights(false);
      setRoute('story');
    } else {
      setProfile(prof);
      setOnboardingStart(1);
      setRoute('onboarding');
    }
  }, []);

  useEffect(() => {
    evaluate();
    // Only react to sign-out here; the onboarding flow drives its own forward
    // progression (and calls onComplete), so we do not re-route on sign-in.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setProfile(null);
        setActiveStory(null);
        setShowInsights(false);
        setOnboardingStart(0);
        setRoute('onboarding');
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [evaluate]);

  if (route === 'boot') {
    return (
      <ScreenBackground>
        <ActivityIndicator style={{ flex: 1 }} color={theme.colors.brightTeal} />
      </ScreenBackground>
    );
  }

  if (route === 'story' && profile) {
    if (showInsights) {
      return <InsightsScreen onBack={() => setShowInsights(false)} />;
    }
    if (activeStory) {
      return (
        <StoryReaderScreen
          story={activeStory}
          onExit={() => setActiveStory(null)}
          onSignOut={() => supabase.auth.signOut()}
          onViewInsights={() => setShowInsights(true)}
        />
      );
    }
    return (
      <StorySetupScreen
        profile={profile}
        onBegin={(s) => setActiveStory(s)}
        onSignOut={() => supabase.auth.signOut()}
        onViewInsights={() => setShowInsights(true)}
      />
    );
  }

  return <OnboardingScreen startStep={onboardingStart} onComplete={evaluate} />;
}
