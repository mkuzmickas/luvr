// LUVR — "What is LUVR" explainer.
// Full-screen, mobile-first, dark Ocean Teal. Warmly explains the concept and
// the three profile dimensions, with styled visuals built from theme tokens and
// the existing RadarChart (no image assets). Closes back to the welcome screen.

import { ScrollView, StyleSheet, Text, View } from 'react-native';

import PrimaryButton from '@/components/PrimaryButton';
import RadarChart from '@/components/RadarChart';
import ScreenBackground from '@/components/ScreenBackground';
import { layout, theme } from '@/lib/theme';

const DIMENSIONS = [
  {
    title: 'Erotic Signature',
    body: 'The type of erotic energy you respond to — the spark, the slow burn, the edge.',
  },
  {
    title: 'Attachment Style',
    body: 'How you bond and connect — the way you reach for closeness, space, or reassurance.',
  },
  {
    title: 'Intimacy Language',
    body: 'How you give and receive intimacy — through words, touch, time, acts, or gifts.',
  },
];

export default function ExplainerScreen({ onClose }: { onClose: () => void }) {
  return (
    <ScreenBackground>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.column}>
          <Text style={styles.close} onPress={onClose}>
            ‹ back
          </Text>

          <Text style={styles.title}>What is LUVR</Text>

          <Text style={styles.lead}>
            LUVR is an interactive erotic story experience. You read a story that
            reacts to your choices — every turn shaped by what you decide next.
          </Text>

          {/* Sample radar — decorative, from theme + RadarChart, no images. */}
          <View style={styles.radarWrap}>
            <RadarChart
              values={[8, 5, 6]}
              labels={['Erotic', 'Attachment', 'Intimacy']}
              max={10}
              size={260}
            />
          </View>

          <Text style={styles.sectionLead}>
            The choices you make quietly reveal your private profile across three
            dimensions.
          </Text>

          {DIMENSIONS.map((d) => (
            <View key={d.title} style={styles.card}>
              <Text style={styles.cardTitle}>{d.title}</Text>
              <Text style={styles.cardBody}>{d.body}</Text>
            </View>
          ))}

          <Text style={styles.closing}>
            The more you read, the deeper your profile becomes.
          </Text>

          <View style={styles.bottom}>
            <PrimaryButton title="Get started" onPress={onClose} />
          </View>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { alignItems: 'center', paddingVertical: 24 },
  column: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.screenPadding,
  },

  close: {
    color: theme.colors.tealAccent,
    fontSize: 14,
    marginBottom: 12,
  },
  title: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 34,
    color: theme.colors.primaryText,
    marginBottom: 16,
  },
  lead: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 19,
    lineHeight: 28,
    color: theme.colors.primaryText,
    marginBottom: 8,
  },

  radarWrap: {
    alignItems: 'center',
    marginVertical: 16,
  },

  sectionLead: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 19,
    lineHeight: 28,
    color: theme.colors.primaryText,
    marginBottom: 16,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 22,
    color: theme.colors.brightTeal,
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.secondaryText,
  },

  closing: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontStyle: 'italic',
    fontSize: 20,
    lineHeight: 28,
    color: theme.colors.primaryText,
    textAlign: 'center',
    marginTop: 12,
  },

  bottom: {
    marginTop: 24,
    marginBottom: 36,
  },
});
