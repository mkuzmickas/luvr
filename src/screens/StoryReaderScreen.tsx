// LUVR — story reader.
// Polished visual layer over the interactive-story loop. All fetch logic,
// state management, error handling, and Supabase calls are unchanged from the
// working version — this is purely a visual + component refactor.

import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import LoadingCards from '@/components/LoadingCards';
import PrimaryButton from '@/components/PrimaryButton';
import ScreenBackground from '@/components/ScreenBackground';
import { supabase } from '@/lib/supabaseClient';
import { theme } from '@/lib/theme';

const EDGE_FUNCTION_URL =
  'https://fjkgyydtzazabmrkopyl.supabase.co/functions/v1/generate-segment';

// Fixed story config for this end-to-end test.
const SETTING = 'Hotel Night';
const WRITING_STYLE = 'spicy';
const GENDER_CONFIG = 'a woman attracted to men';

type Choice = {
  id: string;
  option_label: string;
  option_text: string;
};

export default function StoryReaderScreen() {
  // --- auth state ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState('');

  // --- story state ---
  const [storyId, setStoryId] = useState<string | null>(null);
  const [segmentNumber, setSegmentNumber] = useState(0);
  const [segments, setSegments] = useState<string[]>([]); // all body texts shown
  const [choices, setChoices] = useState<Choice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Track the current signed-in user.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // --- auth handlers ---
  async function handleSignIn() {
    setAuthMessage('Signing in...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setAuthMessage('Sign in error: ' + error.message);
    else setAuthMessage('Signed in as ' + (data.user?.id ?? 'unknown'));
  }

  async function handleSignUp() {
    setAuthMessage('Signing up...');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) setAuthMessage('Sign up error: ' + error.message);
    else
      setAuthMessage(
        'Signed up as ' +
          (data.user?.id ?? 'unknown') +
          ' (if email confirmation is on, confirm then sign in)',
      );
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setAuthMessage('Signed out.');
  }

  // --- edge function call ---
  async function callEdge(payload: Record<string, unknown>) {
    // Publishable/anon key for the Supabase gateway. The function is deployed
    // with --no-verify-jwt, so the user JWT is not required, but the gateway
    // still wants an apikey to route the request.
    const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: publishableKey,
        Authorization: 'Bearer ' + publishableKey,
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error('Edge function returned non-JSON (HTTP ' + res.status + '): ' + text);
    }
    if (!res.ok) {
      throw new Error(
        'Edge function error (HTTP ' + res.status + '): ' + JSON.stringify(json),
      );
    }
    return json as { segment_id: string; body_text: string; choices: Choice[] };
  }

  // --- start a new story ---
  async function startNewStory() {
    setError('');
    if (!userId) {
      setError('Not signed in.');
      return;
    }
    setLoading(true);
    try {
      // reset story display
      setSegments([]);
      setChoices([]);
      setSegmentNumber(0);

      const { data: story, error: storyError } = await supabase
        .from('stories')
        .insert({
          user_id: userId,
          setting: SETTING,
          writing_style: WRITING_STYLE,
          gender_config: GENDER_CONFIG,
          status: 'active',
        })
        .select()
        .single();

      if (storyError || !story) {
        throw new Error('Insert story failed: ' + (storyError?.message ?? 'no row'));
      }
      setStoryId(story.id);

      const result = await callEdge({
        user_id: userId,
        story_id: story.id,
        setting: SETTING,
        custom_prompt: null,
        writing_style: WRITING_STYLE,
        gender_config: GENDER_CONFIG,
        chosen_option_text: null,
        previous_segments_summary: '',
        segment_number: 1,
      });

      setSegments([result.body_text]);
      setChoices(result.choices);
      setSegmentNumber(1);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  // --- pick a choice -> generate the next segment ---
  async function chooseOption(choice: Choice) {
    setError('');
    if (!userId || !storyId) {
      setError('No active story.');
      return;
    }
    setLoading(true);
    try {
      const nextNumber = segmentNumber + 1;
      // Summary = concatenation of the last up to three body texts shown.
      const summary = segments.slice(-3).join('\n\n');

      const result = await callEdge({
        user_id: userId,
        story_id: storyId,
        setting: SETTING,
        custom_prompt: null,
        writing_style: WRITING_STYLE,
        gender_config: GENDER_CONFIG,
        chosen_option_text: choice.option_text,
        previous_segments_summary: summary,
        segment_number: nextNumber,
      });

      setSegments((prev) => [...prev, result.body_text]);
      setChoices(result.choices);
      setSegmentNumber(nextNumber);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  // --- render ---
  return (
    <ScreenBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.column}>
          {/* TEMP dev login — intentionally minimal and tucked away. */}
          <View style={styles.devLogin}>
            <Text style={styles.devLabel}>
              dev login (temporary) ·{' '}
              {userId ? 'signed in: ' + userId : 'not signed in'}
            </Text>
            <View style={styles.devRow}>
              <TextInput
                placeholder="email"
                placeholderTextColor={theme.colors.secondaryText}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                style={styles.devInput}
              />
              <TextInput
                placeholder="password"
                placeholderTextColor={theme.colors.secondaryText}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={styles.devInput}
              />
            </View>
            <View style={styles.devRow}>
              <Text style={styles.devAction} onPress={handleSignIn}>
                sign in
              </Text>
              <Text style={styles.devAction} onPress={handleSignUp}>
                sign up
              </Text>
              {userId ? (
                <Text style={styles.devAction} onPress={handleSignOut}>
                  sign out
                </Text>
              ) : null}
            </View>
            {authMessage ? <Text style={styles.devMessage}>{authMessage}</Text> : null}
          </View>

          {/* Start story */}
          {userId ? (
            segments.length === 0 && !loading ? (
              <View style={styles.startWrap}>
                <PrimaryButton title="Start New Story" onPress={startNewStory} />
              </View>
            ) : null
          ) : (
            <Text style={styles.hint}>Sign in to start a story.</Text>
          )}

          {/* Errors */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>ERROR: {error}</Text>
            </View>
          ) : null}

          {/* Story so far — flowing, book-like paragraphs. */}
          {segments.map((body, i) => (
            <View key={i} style={styles.segment}>
              {body.split('\n').map((para, j) =>
                para.trim() ? (
                  <Text key={j} style={styles.paragraph}>
                    {para.trim()}
                  </Text>
                ) : null,
              )}
            </View>
          ))}

          {/* Loading cards (during any generation) */}
          {loading ? <LoadingCards /> : null}

          {/* Choices */}
          {!loading && choices.length > 0 ? (
            <View style={styles.choicesWrap}>
              <Text style={styles.choicesLabel}>WHAT DO YOU DO</Text>
              {choices.map((c) => (
                <PrimaryButton
                  key={c.id}
                  title={c.option_text}
                  onPress={() => chooseOption(c)}
                  disabled={loading}
                  variant="outline"
                />
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  column: {
    width: '100%',
    maxWidth: 700,
    paddingHorizontal: 24,
  },

  // dev login
  devLogin: {
    marginBottom: 20,
    gap: 6,
  },
  devLabel: {
    color: theme.colors.secondaryText,
    fontSize: 11,
  },
  devRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  devInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.primaryText,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    fontSize: 12,
  },
  devAction: {
    color: theme.colors.tealAccent,
    fontSize: 12,
    paddingVertical: 2,
  },
  devMessage: {
    color: theme.colors.secondaryText,
    fontSize: 11,
  },

  startWrap: {
    marginVertical: 24,
  },
  hint: {
    color: theme.colors.secondaryText,
    fontSize: 14,
    marginVertical: 16,
  },

  errorBox: {
    borderWidth: 1,
    borderColor: 'red',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 13,
  },

  // story text
  segment: {
    marginBottom: 8,
  },
  paragraph: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 19,
    lineHeight: 34,
    color: theme.colors.primaryText,
    marginBottom: 18,
  },

  // choices
  choicesWrap: {
    marginTop: 16,
    marginBottom: 40,
    gap: 10,
  },
  choicesLabel: {
    color: theme.colors.brightTeal,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 6,
  },
});
