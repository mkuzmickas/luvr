import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/lib/theme';

export type ButtonVariant = 'filled' | 'outline';

/**
 * Tappable button with two variants:
 *  - "filled"  (default): solid bright-teal block with cream text. For loud
 *               primary actions like a main begin button.
 *  - "outline": quiet ghost button — transparent background, thin teal border,
 *               cream text. Recedes into the dark page; on hover/press it gains
 *               a faint teal tint and brighter teal border + text.
 *
 * Both share full width, rounded corners, comfortable padding, centered text,
 * and a dimmed disabled state.
 */
export default function PrimaryButton({
  title,
  onPress,
  disabled,
  variant = 'filled',
}: {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
}) {
  if (variant === 'outline') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed, hovered }) => [
          styles.base,
          styles.outline,
          (pressed || hovered) && styles.outlineActive,
          disabled && styles.disabled,
        ]}
      >
        {({ pressed, hovered }) => (
          <>
            {pressed || hovered ? (
              <View pointerEvents="none" style={styles.outlineTint} />
            ) : null}
            <Text
              style={[
                styles.outlineText,
                (pressed || hovered) && styles.outlineTextActive,
              ]}
            >
              {title}
            </Text>
          </>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles.filled,
        pressed && styles.filledPressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={styles.filledText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.4,
  },

  // filled variant
  filled: {
    backgroundColor: theme.colors.brightTeal,
  },
  filledPressed: {
    opacity: 0.82,
  },
  filledText: {
    color: theme.colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  // outline variant
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.tealAccent,
  },
  outlineActive: {
    borderColor: theme.colors.brightTeal,
  },
  outlineTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.tealAccent,
    opacity: 0.12,
  },
  outlineText: {
    color: theme.colors.primaryText,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  outlineTextActive: {
    color: theme.colors.brightTeal,
  },
});
