// Onboarding route — pre-login, no tab bar.
// Signed-out users start at the account step; signed-in-but-not-onboarded users
// start at the profile steps. Fully onboarded users are redirected to the app.

import { Redirect, router } from 'expo-router';

import Splash from '@/components/Splash';
import { useAuth } from '@/lib/auth';
import OnboardingScreen from '@/screens/OnboardingScreen';

export default function OnboardingRoute() {
  const { status, refresh } = useAuth();

  if (status === 'loading') return <Splash />;
  if (status === 'ready') return <Redirect href="/" />;

  return (
    <OnboardingScreen
      startStep={status === 'needsOnboarding' ? 1 : 0}
      onComplete={async () => {
        await refresh();
        router.replace('/');
      }}
    />
  );
}
