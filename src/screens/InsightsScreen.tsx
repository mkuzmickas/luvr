// LUVR — Insights screen.
// Shows the signed-in user's accumulated profile across three dimensions,
// reading one row per user from blueprint_scores, attachment_scores, and
// lovelanguage_scores. Dark Ocean Teal aesthetic + Cormorant Garamond.

import { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import BarChart from '@/components/BarChart';
import PrimaryButton from '@/components/PrimaryButton';
import RadarChart from '@/components/RadarChart';
import ScreenBackground from '@/components/ScreenBackground';
import { isInsightsLocked } from '@/lib/paywall';
import { supabase } from '@/lib/supabaseClient';
import { theme } from '@/lib/theme';

// Placeholder for the future paywall — no real payment logic yet.
function showComingSoon() {
  const message = 'Unlocking full access is coming soon.';
  if (Platform.OS === 'web') {
    // Alert is not implemented on react-native-web.
    window.alert(message);
  } else {
    Alert.alert('Coming soon', message);
  }
}

const MAX_SCORE = 10;

// Dimension definitions: db column -> user-facing label, in order.
const EROTIC = {
  columns: ['energetic', 'sensual', 'sexual', 'kinky', 'shapeshifter'],
  labels: ['The Spark', 'The Savorer', 'The Flame', 'The Explorer', 'The Shifter'],
};
const ATTACHMENT = {
  columns: ['secure', 'anxious', 'avoidant', 'fearful'],
  labels: ['Secure', 'Anxious', 'Avoidant', 'Fearful Avoidant'],
};
const INTIMACY = {
  // "time" is a reserved word in SQL but is safe to read as a JSON key here.
  columns: ['words', 'acts', 'gifts', 'time', 'touch'],
  labels: ['Words', 'Acts', 'Gifts', 'Time', 'Touch'],
};

// Flattering interpretive text for every possible primary type.
const DESCRIPTIONS: Record<string, string> = {
  // Erotic Signature
  'The Spark':
    'You crave anticipation — the electric charge of tension and energy that builds before a single touch. That live-wire current is where your desire truly comes alive.',
  'The Savorer':
    'You are drawn to the senses, the atmosphere, and the slow, luxurious build. For you, pleasure is something to be savored and stretched out, never rushed.',
  'The Flame':
    'You are direct and physically present, readily turned on by the act itself. Your desire is honest, immediate, and gloriously uncomplicated.',
  'The Explorer':
    'You are pulled toward intensity, power, and the thrill of the edge. You are unafraid to chase the experiences most people only imagine.',
  'The Shifter':
    'You crave variety and move fluidly between all the different energies. Your eroticism is expansive, adaptive, and impossible to put in a single box.',
  // Attachment Style
  Secure:
    'You bond with trust, confidence, and an easy comfort in closeness. Connection feels like a safe harbor that you give and receive freely.',
  Anxious:
    'You bond with deep longing and a desire for reassurance and closeness. Your capacity to love intensely and wholeheartedly is a profound gift.',
  Avoidant:
    'You value independence, space, and self-reliance within connection. Your steadiness and quiet autonomy are magnetic in their own right.',
  'Fearful Avoidant':
    'You move between craving closeness and needing distance. That duality gives you a rich, deeply felt, and complex emotional world.',
  // Intimacy Language
  Words:
    'You give and receive love through affirmation and spoken desire. The right words land on you with the force of a touch.',
  Acts:
    'You express care through gestures, effort, and showing up. For you, love is something you do, not just something you say.',
  Gifts:
    'You connect through meaningful tokens and the art of giving. A single thoughtful object can carry your whole heart.',
  Time:
    'You bond through undivided presence and attention. Nothing says love to you like someone choosing simply to be with you.',
  Touch:
    'You connect most deeply through physical closeness. Skin to skin is where you feel most seen and understood.',
};

type Row = Record<string, number> | null;

function primaryIndex(values: number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[best]) best = i;
  }
  return best;
}

export default function InsightsScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [blueprint, setBlueprint] = useState<Row>(null);
  const [attachment, setAttachment] = useState<Row>(null);
  const [lovelanguage, setLovelanguage] = useState<Row>(null);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) {
          throw new Error('Not signed in. Sign in on the story screen first.');
        }

        const [bp, at, ll, pr] = await Promise.all([
          supabase
            .from('blueprint_scores')
            .select('energetic,sensual,sexual,kinky,shapeshifter,sample_count')
            .eq('user_id', userId)
            .maybeSingle(),
          supabase
            .from('attachment_scores')
            .select('secure,anxious,avoidant,fearful,sample_count')
            .eq('user_id', userId)
            .maybeSingle(),
          supabase
            .from('lovelanguage_scores')
            .select('words,acts,gifts,time,touch,sample_count')
            .eq('user_id', userId)
            .maybeSingle(),
          supabase
            .from('profiles')
            .select('is_premium')
            .eq('id', userId)
            .maybeSingle(),
        ]);

        if (bp.error) throw new Error('blueprint: ' + bp.error.message);
        if (at.error) throw new Error('attachment: ' + at.error.message);
        if (ll.error) throw new Error('lovelanguage: ' + ll.error.message);

        if (!active) return;
        setBlueprint(bp.data as Row);
        setAttachment(at.data as Row);
        setLovelanguage(ll.data as Row);
        setIsPremium(Boolean((pr.data as { is_premium?: boolean } | null)?.is_premium));
      } catch (e: any) {
        if (active) setError(String(e?.message ?? e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const valuesFor = (row: Row, columns: string[]) =>
    columns.map((c) => Number(row?.[c] ?? 0));

  const sampleCount = Math.max(
    Number(blueprint?.sample_count ?? 0),
    Number(attachment?.sample_count ?? 0),
    Number(lovelanguage?.sample_count ?? 0),
  );

  const eroticValues = valuesFor(blueprint, EROTIC.columns);
  const attachmentValues = valuesFor(attachment, ATTACHMENT.columns);
  const intimacyValues = valuesFor(lovelanguage, INTIMACY.columns);

  const allZero =
    [...eroticValues, ...attachmentValues, ...intimacyValues].every(
      (v) => v === 0,
    );
  const isEmpty = sampleCount === 0 || allZero;
  // Paywall gating: premium always sees full insights; non-premium locks once
  // past the free choice limit. (No payment logic — only the gating structure.)
  const locked = isInsightsLocked(isPremium, sampleCount);

  return (
    <ScreenBackground>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.column}>
          <Text style={styles.title}>Your Profile</Text>

          {loading ? (
            <Text style={styles.muted}>Reading your profile...</Text>
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>ERROR: {error}</Text>
            </View>
          ) : isEmpty ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Your profile is waiting</Text>
              <Text style={styles.emptyBody}>
                You have not made any choices yet. Read a story and follow what
                draws you — every choice you make quietly shapes your erotic
                signature, your attachment style, and your intimacy language.
                Come back here to discover what your desires reveal.
              </Text>
            </View>
          ) : locked ? (
            <View style={styles.lockedCard}>
              {/* Decorative, faded sample chart behind the lock for visual interest. */}
              <View style={styles.lockedChart} pointerEvents="none">
                <RadarChart
                  values={[7, 5, 8, 4, 6]}
                  labels={['', '', '', '', '']}
                  max={MAX_SCORE}
                  size={220}
                />
              </View>
              <Text style={styles.lockedTitle}>Your profile is ready</Text>
              <Text style={styles.lockedBody}>
                You have made {sampleCount} choices, and your erotic signature,
                attachment style, and intimacy language have taken shape. Unlock
                full access to see your complete profile.
              </Text>
              <View style={styles.lockedButton}>
                <PrimaryButton title="Unlock" onPress={showComingSoon} />
              </View>
            </View>
          ) : (
            <>
              {/* Erotic Signature */}
              <Section
                label="EROTIC SIGNATURE"
                chart={
                  <RadarChart values={eroticValues} labels={EROTIC.labels} max={MAX_SCORE} />
                }
                primary={EROTIC.labels[primaryIndex(eroticValues)]}
              />

              {/* Attachment Style */}
              <Section
                label="ATTACHMENT STYLE"
                chart={
                  <RadarChart
                    values={attachmentValues}
                    labels={ATTACHMENT.labels}
                    max={MAX_SCORE}
                  />
                }
                primary={ATTACHMENT.labels[primaryIndex(attachmentValues)]}
              />

              {/* Intimacy Language */}
              <Section
                label="INTIMACY LANGUAGE"
                chart={
                  <BarChart values={intimacyValues} labels={INTIMACY.labels} max={MAX_SCORE} />
                }
                primary={INTIMACY.labels[primaryIndex(intimacyValues)]}
              />

              <Text style={styles.footer}>
                {sampleCount} {sampleCount === 1 ? 'choice has' : 'choices have'}{' '}
                shaped this profile so far
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

function Section({
  label,
  chart,
  primary,
}: {
  label: string;
  chart: React.ReactNode;
  primary: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.chartWrap}>{chart}</View>
      <Text style={styles.primaryName}>{primary}</Text>
      <Text style={styles.description}>{DESCRIPTIONS[primary] ?? ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { alignItems: 'center', paddingVertical: 32 },
  column: { width: '100%', maxWidth: 700, paddingHorizontal: 24 },

  back: {
    color: theme.colors.tealAccent,
    fontSize: 14,
    marginBottom: 12,
  },
  title: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 34,
    color: theme.colors.primaryText,
    marginBottom: 24,
  },
  muted: {
    color: theme.colors.secondaryText,
    fontSize: 14,
  },

  errorBox: {
    borderWidth: 1,
    borderColor: 'red',
    borderRadius: 8,
    padding: 10,
  },
  errorText: { color: 'red', fontSize: 13 },

  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    padding: 24,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 24,
    color: theme.colors.brightTeal,
  },
  emptyBody: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 18,
    lineHeight: 28,
    color: theme.colors.primaryText,
  },

  lockedCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  lockedChart: {
    opacity: 0.18,
    marginBottom: -160,
    marginTop: 8,
  },
  lockedTitle: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 26,
    color: theme.colors.brightTeal,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  lockedBody: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 18,
    lineHeight: 27,
    color: theme.colors.primaryText,
    textAlign: 'center',
    marginBottom: 20,
  },
  lockedButton: {
    alignSelf: 'stretch',
  },

  section: {
    marginBottom: 44,
    alignItems: 'center',
  },
  sectionLabel: {
    alignSelf: 'flex-start',
    color: theme.colors.brightTeal,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 16,
  },
  chartWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  primaryName: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 28,
    color: theme.colors.tealAccent,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 18,
    lineHeight: 28,
    color: theme.colors.primaryText,
    textAlign: 'center',
  },
  footer: {
    color: theme.colors.secondaryText,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 40,
  },
});
