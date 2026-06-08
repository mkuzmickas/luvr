// LUVR — shareable result card.
// A self-contained branded card showing ONLY the user's three primary types and
// their short descriptors — never raw scores or the full breakdown. Designed to
// be captured to an image and posted to social media.

import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/lib/theme';

export type ShareEntry = { category: string; name: string; descriptor: string };

const ShareCard = forwardRef<View, { entries: ShareEntry[] }>(
  ({ entries }, ref) => {
    return (
      <View ref={ref} style={styles.card}>
        <Text style={styles.wordmark}>LUVR</Text>
        <Text style={styles.heading}>My LUVR Profile</Text>

        <View style={styles.entries}>
          {entries.map((e) => (
            <View key={e.category} style={styles.entry}>
              <Text style={styles.category}>{e.category.toUpperCase()}</Text>
              <Text style={styles.name}>{e.name}</Text>
              <Text style={styles.descriptor}>{e.descriptor}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>Discover yours at LUVR</Text>
      </View>
    );
  },
);

ShareCard.displayName = 'ShareCard';
export default ShareCard;

const styles = StyleSheet.create({
  card: {
    width: 340,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 30,
    letterSpacing: 6,
    color: theme.colors.brightTeal,
  },
  heading: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 20,
    color: theme.colors.secondaryText,
    marginTop: 4,
    marginBottom: 28,
  },
  entries: {
    alignSelf: 'stretch',
    gap: 22,
  },
  entry: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 18,
  },
  category: {
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '600',
    color: theme.colors.tealAccent,
    marginBottom: 6,
  },
  name: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 28,
    color: theme.colors.primaryText,
    textAlign: 'center',
  },
  descriptor: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 16,
    color: theme.colors.secondaryText,
    textAlign: 'center',
    marginTop: 4,
  },
  footer: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 15,
    letterSpacing: 1,
    color: theme.colors.brightTeal,
    marginTop: 30,
  },
});
