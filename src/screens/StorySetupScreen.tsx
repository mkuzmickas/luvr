// LUVR — story setup.
// Shown after onboarding, before reading. The user picks one of eleven preset
// settings OR types a custom fantasy (mutually exclusive), then taps Begin,
// which creates the story row and hands the params to the reader.

import { useState } from 'react';
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

import PrimaryButton from '@/components/PrimaryButton';
import ScreenBackground from '@/components/ScreenBackground';
import { buildGenderConfig, DEFAULT_WRITING_STYLE } from '@/lib/story';
import { supabase } from '@/lib/supabaseClient';
import { theme } from '@/lib/theme';
import { Profile, StoryParams } from '@/lib/types';

const SETTINGS = [
  'Hotel Night',
  'Beach Vacation',
  'Mountain Cabin',
  'Night Club',
  'Music Festival',
  'Kingdom and Court',
  'Viking Era',
  'Space Station',
  'Pirate Voyage',
  'Office Dynamic',
  'Post-Apocalyptic',
];

export default function StorySetupScreen({
  profile,
  onBegin,
  onSignOut,
  onViewInsights,
}: {
  profile: Profile;
  onBegin: (story: StoryParams) => void;
  onSignOut: () => void;
  onViewInsights: () => void;
}) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Tapping a preset clears any custom text; typing custom deselects presets.
  function selectPreset(name: string) {
    setSelectedPreset(name);
    setCustomText('');
  }
  function changeCustom(text: string) {
    setCustomText(text);
    if (text.length > 0) setSelectedPreset(null);
  }

  const canBegin = selectedPreset !== null || customText.trim().length > 0;

  async function begin() {
    if (!canBegin) return;
    setError('');
    setCreating(true);
    try {
      const usingCustom = selectedPreset === null;
      const setting = usingCustom ? null : selectedPreset;
      const customPrompt = usingCustom ? customText.trim() : null;
      const writingStyle = DEFAULT_WRITING_STYLE;
      const genderConfig = buildGenderConfig(profile.gender, profile.attracted_to);

      const { data: story, error: storyError } = await supabase
        .from('stories')
        .insert({
          user_id: profile.id,
          setting,
          custom_prompt: customPrompt,
          writing_style: writingStyle,
          gender_config: genderConfig,
          status: 'active',
        })
        .select()
        .single();

      if (storyError || !story) {
        throw new Error('Could not create story: ' + (storyError?.message ?? 'no row'));
      }

      onBegin({
        storyId: story.id,
        userId: profile.id,
        setting,
        customPrompt,
        writingStyle,
        genderConfig,
      });
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.column}>
            {/* top bar */}
            <View style={styles.topBar}>
              <Text style={styles.topLink} onPress={onSignOut}>
                sign out
              </Text>
              <Text style={styles.topLink} onPress={onViewInsights}>
                view insights ›
              </Text>
            </View>

            <Text style={styles.heading}>Begin your story</Text>

            {/* preset grid */}
            <View style={styles.grid}>
              {SETTINGS.map((name) => {
                const selected = selectedPreset === name;
                return (
                  <Pressable
                    key={name}
                    onPress={() => selectPreset(name)}
                    style={[styles.card, selected && styles.cardSelected]}
                  >
                    <Text
                      style={[styles.cardLabel, selected && styles.cardLabelSelected]}
                    >
                      {name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* custom fantasy */}
            <Text style={styles.customLabel}>Or describe your own fantasy</Text>
            <TextInput
              placeholder="type your own scenario..."
              placeholderTextColor={theme.colors.secondaryText}
              value={customText}
              onChangeText={changeCustom}
              multiline
              style={styles.customInput}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.bottom}>
              <PrimaryButton
                title={creating ? 'Starting...' : 'Begin'}
                onPress={begin}
                disabled={!canBegin || creating}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { alignItems: 'center', paddingVertical: 24 },
  column: { width: '100%', maxWidth: 700, paddingHorizontal: 24 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  topLink: {
    color: theme.colors.tealAccent,
    fontSize: 13,
    letterSpacing: 1,
  },

  heading: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 34,
    color: theme.colors.primaryText,
    textAlign: 'center',
    marginBottom: 24,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    minHeight: 64,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSelected: {
    borderColor: theme.colors.brightTeal,
  },
  cardLabel: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 19,
    color: theme.colors.primaryText,
    textAlign: 'center',
  },
  cardLabelSelected: {
    color: theme.colors.brightTeal,
  },

  customLabel: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 18,
    color: theme.colors.secondaryText,
    marginTop: 24,
    marginBottom: 10,
  },
  customInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    color: theme.colors.primaryText,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  error: {
    color: 'red',
    fontSize: 13,
    marginTop: 12,
  },

  bottom: {
    marginTop: 28,
    marginBottom: 32,
  },
});
