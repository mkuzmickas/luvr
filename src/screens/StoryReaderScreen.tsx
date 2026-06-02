// LUVR — story reader.
// Reads the signed-in user's profile (writing style + gender config) from props
// and runs the interactive-story loop. Authentication is now handled by
// onboarding, so this screen no longer has a dev login.

import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import LoadingCards from '@/components/LoadingCards';
import PrimaryButton from '@/components/PrimaryButton';
import ScreenBackground from '@/components/ScreenBackground';
import { supabase } from '@/lib/supabaseClient';
import { theme } from '@/lib/theme';
import { Profile } from '@/lib/types';
import InsightsScreen from '@/screens/InsightsScreen';

const EDGE_FUNCTION_URL =
  'https://fjkgyydtzazabmrkopyl.supabase.co/functions/v1/generate-segment';

// The story-setup screen does not exist yet, so the setting stays fixed for now.
const SETTING = 'Hotel Night';

type Choice = {
  id: string;
  option_label: string;
  option_text: string;
};

// Build the gender_config phrase the model expects, e.g. "a woman attracted to men".
function buildGenderConfig(gender: string | null, attractedTo: string | null): string {
  const g =
    gender === 'Man'
      ? 'a man'
      : gender === 'Woman'
      ? 'a woman'
      : gender === 'Non-binary'
      ? 'a non-binary person'
      : 'a person';
  const attractedMap: Record<string, string> = {
    Women: 'women',
    Men: 'men',
    Both: 'both men and women',
    'Trans women': 'trans women',
    'Trans men': 'trans men',
  };
  const a = attractedTo ? attractedMap[attractedTo] ?? attractedTo.toLowerCase() : 'others';
  return `${g} attracted to ${a}`;
}

export default function StoryReaderScreen({
  profile,
  onSignOut,
}: {
  profile: Profile;
  onSignOut: () => void;
}) {
  const userId = profile.id;
  const writingStyle = (profile.writing_style as 'sensual' | 'explicit') ?? 'sensual';
  const genderConfig = buildGenderConfig(profile.gender, profile.attracted_to);

  // --- story state ---
  const [storyId, setStoryId] = useState<string | null>(null);
  const [segmentNumber, setSegmentNumber] = useState(0);
  const [segments, setSegments] = useState<string[]>([]); // all body texts shown
  const [choices, setChoices] = useState<Choice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // TEMP: until real navigation exists, toggle the Insights screen.
  const [showInsights, setShowInsights] = useState(false);

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
          writing_style: writingStyle,
          gender_config: genderConfig,
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
        writing_style: writingStyle,
        gender_config: genderConfig,
        chosen_option_text: null,
        chosen_choice_id: null,
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
    if (!storyId) {
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
        writing_style: writingStyle,
        gender_config: genderConfig,
        chosen_option_text: choice.option_text,
        chosen_choice_id: choice.id,
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
  if (showInsights) {
    return <InsightsScreen onBack={() => setShowInsights(false)} />;
  }

  return (
    <ScreenBackground>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.column}>
          {/* top bar: sign out + temp insights link */}
          <View style={styles.topBar}>
            <Text style={styles.topLink} onPress={onSignOut}>
              sign out
            </Text>
            <Text style={styles.topLink} onPress={() => setShowInsights(true)}>
              view insights ›
            </Text>
          </View>

          {/* Start story */}
          {segments.length === 0 && !loading ? (
            <View style={styles.startWrap}>
              <PrimaryButton title="Start New Story" onPress={startNewStory} />
            </View>
          ) : null}

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

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  topLink: {
    color: theme.colors.tealAccent,
    fontSize: 13,
    letterSpacing: 1,
  },

  startWrap: {
    marginVertical: 24,
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
