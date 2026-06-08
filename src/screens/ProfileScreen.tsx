// LUVR — Profile tab.
// Shows the user's display name, account email, choices made, and membership
// tier, with sign out and a link to reopen the explainer. Structured in clear
// sections so account and subscription management can be added later.

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import PrimaryButton from '@/components/PrimaryButton';
import ScreenBackground from '@/components/ScreenBackground';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';
import { layout, theme } from '@/lib/theme';

export default function ProfileScreen() {
  const { profile, email, signOut } = useAuth();
  const [sampleCount, setSampleCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!profile) return;
      const { data } = await supabase
        .from('blueprint_scores')
        .select('sample_count')
        .eq('user_id', profile.id)
        .maybeSingle();
      if (active) {
        setSampleCount(
          Number((data as { sample_count?: number } | null)?.sample_count ?? 0),
        );
      }
    })();
    return () => {
      active = false;
    };
  }, [profile]);

  const isPremium = !!profile?.is_premium;

  return (
    <ScreenBackground>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.column}>
          {/* Identity */}
          <Text style={styles.name}>{profile?.display_name || 'Your profile'}</Text>
          <Text style={styles.email}>{email ?? ''}</Text>

          {/* Account section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ACCOUNT</Text>
            <View style={styles.row}>
              <Text style={styles.rowKey}>Choices made</Text>
              <Text style={styles.rowValue}>
                {sampleCount === null ? '—' : sampleCount}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowKey}>Membership</Text>
              <Text style={styles.rowValue}>{isPremium ? 'Premium' : 'Free'}</Text>
            </View>
          </View>

          {/* Membership section — placeholder for future subscription management. */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>MEMBERSHIP</Text>
            <Text style={styles.muted}>
              {isPremium
                ? 'You have full access to your complete profile.'
                : 'Free members can view their profile up to the free limit.'}
            </Text>
          </View>

          {/* About */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ABOUT</Text>
            <Text style={styles.link} onPress={() => router.push('/explainer')}>
              What is LUVR
            </Text>
          </View>

          <View style={styles.bottom}>
            <PrimaryButton title="Sign out" onPress={signOut} />
          </View>
        </View>
      </ScrollView>
    </ScreenBackground>
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

  name: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 34,
    color: theme.colors.primaryText,
  },
  email: {
    fontSize: 14,
    color: theme.colors.secondaryText,
    marginTop: 4,
    marginBottom: 12,
  },

  section: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 16,
  },
  sectionLabel: {
    color: theme.colors.brightTeal,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowKey: {
    fontSize: 16,
    color: theme.colors.secondaryText,
  },
  rowValue: {
    fontSize: 16,
    color: theme.colors.primaryText,
    fontWeight: '600',
  },
  muted: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.secondaryText,
  },
  link: {
    color: theme.colors.tealAccent,
    fontSize: 16,
  },

  bottom: {
    marginTop: 36,
    marginBottom: 40,
  },
});
