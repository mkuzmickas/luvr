// LUVR — story reader.
// Receives an already-created story (from the setup screen) and its parameters.
// On load it immediately generates segment one; there is no Start button here.

import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import LoadingCards from '@/components/LoadingCards';
import PrimaryButton from '@/components/PrimaryButton';
import ScreenBackground from '@/components/ScreenBackground';
import { layout, theme } from '@/lib/theme';
import { StoryParams } from '@/lib/types';

const EDGE_FUNCTION_URL =
  'https://fjkgyydtzazabmrkopyl.supabase.co/functions/v1/generate-segment';

type Choice = {
  id: string;
  option_label: string;
  option_text: string;
};

export default function StoryReaderScreen({
  story,
  onExit,
}: {
  story: StoryParams;
  onExit: () => void;
}) {
  const [segmentNumber, setSegmentNumber] = useState(0);
  const [segments, setSegments] = useState<string[]>([]); // all body texts shown
  const [choices, setChoices] = useState<Choice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  // --- generate the opening segment on load ---
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      setError('');
      setLoading(true);
      try {
        const result = await callEdge({
          user_id: story.userId,
          story_id: story.storyId,
          setting: story.setting,
          custom_prompt: story.customPrompt,
          writing_style: story.writingStyle,
          gender_config: story.genderConfig,
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
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- pick a choice -> generate the next segment ---
  async function chooseOption(choice: Choice) {
    setError('');
    setLoading(true);
    try {
      const nextNumber = segmentNumber + 1;
      // Summary = concatenation of the last up to three body texts shown.
      const summary = segments.slice(-3).join('\n\n');

      const result = await callEdge({
        user_id: story.userId,
        story_id: story.storyId,
        setting: story.setting,
        custom_prompt: story.customPrompt,
        writing_style: story.writingStyle,
        gender_config: story.genderConfig,
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
  return (
    <ScreenBackground>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.column}>
          {/* top bar: leave the current story and return to setup */}
          <View style={styles.topBar}>
            <Text style={styles.topLink} onPress={onExit}>
              ‹ new story
            </Text>
          </View>

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
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.screenPadding,
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  topRight: {
    flexDirection: 'row',
    gap: 16,
  },
  topLink: {
    color: theme.colors.tealAccent,
    fontSize: 13,
    letterSpacing: 1,
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
