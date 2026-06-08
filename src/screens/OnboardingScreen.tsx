// LUVR — onboarding flow.
// Mobile-first sequence of full-screen steps: account creation, then profile
// questions, finishing by writing the profile row and signaling completion.
// Cormorant Garamond for headings/prompts, system font for inputs/buttons.

import { ReactNode, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { router } from 'expo-router';

import PrimaryButton from '@/components/PrimaryButton';
import ScreenBackground from '@/components/ScreenBackground';
import { DEFAULT_WRITING_STYLE } from '@/lib/story';
import { supabase } from '@/lib/supabaseClient';
import { layout, theme } from '@/lib/theme';

const TOTAL_STEPS = 4;

const GENDER_OPTIONS = ['Man', 'Woman', 'Non-binary'];
const ATTRACTED_OPTIONS = ['Women', 'Men', 'Both', 'Trans women', 'Trans men'];

export default function OnboardingScreen({
  startStep,
  onComplete,
}: {
  // 0 = begin at account creation; 1 = begin at the profile questions.
  startStep: 0 | 1;
  onComplete: () => void;
}) {
  const [step, setStep] = useState<number>(startStep);

  // account
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // profile answers
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [attractedTo, setAttractedTo] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // --- account creation / sign in ---
  async function handleAuth() {
    setAuthError('');
    setAuthLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setAuthError(error.message);
          return;
        }
        if (!data.session) {
          // Email confirmation is enabled; cannot proceed until confirmed.
          setMode('signin');
          setAuthError(
            'Account created. Please confirm your email, then sign in below.',
          );
          return;
        }
        setStep(1);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setAuthError(error.message);
          return;
        }
        setStep(1);
      }
    } finally {
      setAuthLoading(false);
    }
  }

  // --- save profile + finish ---
  async function finish() {
    setSaveError('');
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error('No signed-in user.');

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          gender,
          attracted_to: attractedTo,
          writing_style: DEFAULT_WRITING_STYLE,
          onboarding_complete: true,
        })
        .eq('id', uid);

      if (error) throw new Error(error.message);
      onComplete();
    } catch (e: any) {
      setSaveError(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  // Advance from a profile step (or finish on the last one).
  function next() {
    if (step >= TOTAL_STEPS - 1) {
      finish();
    } else {
      setStep((s) => s + 1);
    }
  }

  // Whether the Continue button is enabled for the current step.
  const canContinue =
    step === 1
      ? displayName.trim().length > 0
      : step === 2
      ? gender !== null
      : step === 3
      ? attractedTo !== null
      : true;

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* progress */}
          <View style={styles.progressRow}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <View
                key={i}
                style={[styles.progressSeg, i <= step && styles.progressSegActive]}
              />
            ))}
          </View>

          <ScrollView
            contentContainerStyle={styles.center}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {step === 0 ? (
              <View style={styles.block}>
                <Text style={styles.heading}>Know yourself. Know what you want.</Text>
                <Text style={styles.subtext}>
                  An erotic story that reveals your erotic signature, attachment
                  style, and intimacy language.
                </Text>
                <View style={styles.form}>
                  <TextInput
                    placeholder="email"
                    placeholderTextColor={theme.colors.secondaryText}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    style={styles.input}
                  />
                  <TextInput
                    placeholder="password"
                    placeholderTextColor={theme.colors.secondaryText}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    style={styles.input}
                  />
                  {authError ? <Text style={styles.error}>{authError}</Text> : null}
                  <Text
                    style={styles.switchLink}
                    onPress={() => {
                      setAuthError('');
                      setMode((m) => (m === 'signup' ? 'signin' : 'signup'));
                    }}
                  >
                    {mode === 'signup'
                      ? 'Already have an account? Sign in'
                      : 'Need an account? Create one'}
                  </Text>
                </View>
                <Text style={styles.whatIsLink} onPress={() => router.push('/explainer')}>
                  What is LUVR
                </Text>
              </View>
            ) : step === 1 ? (
              <View style={styles.block}>
                <Text style={styles.prompt}>What should we call you?</Text>
                <TextInput
                  placeholder="your name"
                  placeholderTextColor={theme.colors.secondaryText}
                  value={displayName}
                  onChangeText={setDisplayName}
                  style={styles.input}
                />
              </View>
            ) : step === 2 ? (
              <View style={styles.block}>
                <Text style={styles.prompt}>How do you identify?</Text>
                <View style={styles.options}>
                  {GENDER_OPTIONS.map((o) => (
                    <Option
                      key={o}
                      label={o}
                      selected={gender === o}
                      onPress={() => setGender(o)}
                    />
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.block}>
                <Text style={styles.prompt}>Who are you drawn to?</Text>
                <View style={styles.options}>
                  {ATTRACTED_OPTIONS.map((o) => (
                    <Option
                      key={o}
                      label={o}
                      selected={attractedTo === o}
                      onPress={() => setAttractedTo(o)}
                    />
                  ))}
                </View>
                {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
              </View>
            )}
          </ScrollView>

          {/* bottom action */}
          <View style={styles.bottom}>
            {step === 0 ? (
              <PrimaryButton
                title={
                  authLoading
                    ? 'Please wait...'
                    : mode === 'signup'
                    ? 'Create account'
                    : 'Sign in'
                }
                onPress={handleAuth}
                disabled={authLoading || !email.trim() || !password}
              />
            ) : (
              <PrimaryButton
                title={
                  saving
                    ? 'Saving...'
                    : step >= TOTAL_STEPS - 1
                    ? 'Begin your story'
                    : 'Continue'
                }
                onPress={next}
                disabled={!canContinue || saving}
              />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

function Option({
  label,
  example,
  selected,
  onPress,
}: {
  label: string;
  example?: string;
  selected: boolean;
  onPress: () => void;
}): ReactNode {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.option, selected && styles.optionSelected]}
    >
      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
        {label}
      </Text>
      {example ? <Text style={styles.optionExample}>{example}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingTop: 24,
    paddingBottom: 28,
  },

  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  progressSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },
  progressSegActive: {
    backgroundColor: theme.colors.brightTeal,
  },

  center: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  block: {
    gap: 16,
  },

  heading: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 34,
    lineHeight: 40,
    color: theme.colors.primaryText,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.secondaryText,
    textAlign: 'center',
  },
  prompt: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 30,
    color: theme.colors.primaryText,
    textAlign: 'center',
    marginBottom: 4,
  },

  form: {
    gap: 12,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    color: theme.colors.primaryText,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 10,
    fontSize: 16,
  },
  switchLink: {
    color: theme.colors.tealAccent,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  whatIsLink: {
    color: theme.colors.secondaryText,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
  },
  error: {
    color: 'red',
    fontSize: 13,
    textAlign: 'center',
  },

  options: {
    gap: 12,
  },
  option: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  optionSelected: {
    borderColor: theme.colors.brightTeal,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primaryText,
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: theme.colors.brightTeal,
  },
  optionExample: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontStyle: 'italic',
    fontSize: 16,
    lineHeight: 22,
    color: theme.colors.secondaryText,
    textAlign: 'center',
    marginTop: 8,
  },

  bottom: {
    paddingTop: 12,
  },
});
