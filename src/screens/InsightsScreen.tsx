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
import ShareSheet from '@/components/ShareSheet';
import {
  ATTACHMENT,
  DESCRIPTIONS,
  EROTIC,
  INTIMACY,
  MAX_SCORE,
  primaryIndex,
  SHORT_DESCRIPTORS,
} from '@/lib/insights';
import { isInsightsLocked } from '@/lib/paywall';
import { supabase } from '@/lib/supabaseClient';
import { layout, theme } from '@/lib/theme';

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

type Row = Record<string, number> | null;

export default function InsightsScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [blueprint, setBlueprint] = useState<Row>(null);
  const [attachment, setAttachment] = useState<Row>(null);
  const [lovelanguage, setLovelanguage] = useState<Row>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [showShare, setShowShare] = useState(false);

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

  // The three primary types — the only thing the share card ever reveals.
  const eroticPrimary = EROTIC.labels[primaryIndex(eroticValues)];
  const attachmentPrimary = ATTACHMENT.labels[primaryIndex(attachmentValues)];
  const intimacyPrimary = INTIMACY.labels[primaryIndex(intimacyValues)];
  const shareEntries = [
    {
      category: EROTIC.key,
      name: eroticPrimary,
      descriptor: SHORT_DESCRIPTORS[eroticPrimary],
    },
    {
      category: ATTACHMENT.key,
      name: attachmentPrimary,
      descriptor: SHORT_DESCRIPTORS[attachmentPrimary],
    },
    {
      category: INTIMACY.key,
      name: intimacyPrimary,
      descriptor: SHORT_DESCRIPTORS[intimacyPrimary],
    },
  ];

  // Sharing is only offered once the user actually has a profile, and only ever
  // opens on an explicit tap — nothing is generated or exposed otherwise.
  const canShare = !loading && !error && !isEmpty;

  return (
    <ScreenBackground>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.column}>
          <Text style={styles.title}>Your Profile</Text>

          {canShare ? (
            <View style={styles.shareWrap}>
              <PrimaryButton
                title="Share your profile"
                variant="outline"
                onPress={() => setShowShare(true)}
              />
            </View>
          ) : null}

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

      {showShare ? (
        <ShareSheet entries={shareEntries} onClose={() => setShowShare(false)} />
      ) : null}
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
  column: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.screenPadding,
  },

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
  shareWrap: {
    marginBottom: 20,
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
