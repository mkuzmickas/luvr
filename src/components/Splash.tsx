import { ActivityIndicator } from 'react-native';

import ScreenBackground from '@/components/ScreenBackground';
import { theme } from '@/lib/theme';

// Full-screen dark splash shown while auth/profile is still resolving.
export default function Splash() {
  return (
    <ScreenBackground>
      <ActivityIndicator style={{ flex: 1 }} color={theme.colors.brightTeal} />
    </ScreenBackground>
  );
}
