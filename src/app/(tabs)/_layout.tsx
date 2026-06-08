import { Redirect, Tabs } from 'expo-router';

import Splash from '@/components/Splash';
import { useAuth } from '@/lib/auth';
import { theme } from '@/lib/theme';

// The tab bar only renders for fully onboarded, signed-in users. Anyone else is
// redirected into the onboarding flow (which has no tab bar).
export default function TabsLayout() {
  const { status } = useAuth();

  if (status === 'loading') return <Splash />;
  if (status !== 'ready') return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background },
        tabBarActiveTintColor: theme.colors.tealAccent,
        tabBarInactiveTintColor: theme.colors.secondaryText,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
        },
        // Minimal chrome: text labels only.
        tabBarIconStyle: { display: 'none' },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Story' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
