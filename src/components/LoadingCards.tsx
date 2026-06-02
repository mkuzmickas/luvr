import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { theme } from '@/lib/theme';

const LINES = [
  'your story is taking shape',
  'notice what you are drawn to',
  'every choice reveals something',
  'pay attention to what excites you',
  'there are no wrong answers only true ones',
];

const ROTATE_MS = 3500;

/**
 * Shown while a segment is generating. Fills the content area on the dark
 * background and displays one evocative line at a time inside a softly glowing,
 * gently pulsing card, rotating through the lines every 3.5 seconds.
 */
export default function LoadingCards() {
  const [index, setIndex] = useState(0);
  const pulse = useRef(new Animated.Value(0.65)).current;

  // Rotate the line every 3.5s.
  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % LINES.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  // Subtle continuous pulse.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0.65,
          duration: 1400,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.card, { opacity: pulse }]}>
        <Animated.Text style={styles.text}>{LINES[index]}</Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    paddingVertical: 30,
    paddingHorizontal: 30,
    maxWidth: 440,
    alignItems: 'center',
    // Soft teal glow.
    shadowColor: theme.colors.brightTeal,
    shadowOpacity: 0.55,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  text: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 23,
    lineHeight: 31,
    color: theme.colors.primaryText,
    textAlign: 'center',
  },
});
