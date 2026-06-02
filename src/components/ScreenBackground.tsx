import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { theme } from '@/lib/theme';

/**
 * Fills the screen with the theme background color and lays a subtle vertical
 * gradient over it, fading from the surface color at the top into the
 * background color below. Children render on top of the gradient.
 */
export default function ScreenBackground({
  children,
  style,
}: {
  children?: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.root, style]}>
      <LinearGradient
        colors={[theme.colors.surface, theme.colors.background]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
