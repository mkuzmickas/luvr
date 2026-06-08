// LUVR — share overlay.
// Presents the result card (only after an explicit user action) and lets the
// user save it as an image. Web uses html-to-image to produce a downloadable
// PNG; native falls back to a screenshot instruction.

import { useRef, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import PrimaryButton from '@/components/PrimaryButton';
import ScreenBackground from '@/components/ScreenBackground';
import ShareCard, { ShareEntry } from '@/components/ShareCard';
import { theme } from '@/lib/theme';

export default function ShareSheet({
  entries,
  onClose,
}: {
  entries: ShareEntry[];
  onClose: () => void;
}) {
  const cardRef = useRef<View>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSave() {
    if (Platform.OS !== 'web') {
      setMessage('Take a screenshot of this card to save and share it.');
      return;
    }
    setWorking(true);
    setMessage('');
    try {
      const node = cardRef.current as unknown as HTMLElement | null;
      if (!node) throw new Error('card not ready');
      const htmlToImage = await import('html-to-image');
      const dataUrl = await htmlToImage.toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: theme.colors.background,
      });
      const link = document.createElement('a');
      link.download = 'luvr-profile.png';
      link.href = dataUrl;
      link.click();
      setMessage('Saved. Check your downloads, then share it anywhere.');
    } catch {
      setMessage('Could not generate the image. Screenshot the card to save it.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <ScreenBackground>
        <ScrollView contentContainerStyle={styles.center}>
          <Text style={styles.close} onPress={onClose}>
            ✕ close
          </Text>

          <ShareCard ref={cardRef} entries={entries} />

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.actions}>
            <PrimaryButton
              title={working ? 'Generating...' : 'Save image'}
              onPress={handleSave}
              disabled={working}
            />
          </View>

          {Platform.OS !== 'web' ? (
            <Text style={styles.hint}>
              On your phone you can also screenshot this card to save it.
            </Text>
          ) : null}
        </ScrollView>
      </ScreenBackground>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 18,
  },
  close: {
    alignSelf: 'flex-end',
    color: theme.colors.tealAccent,
    fontSize: 14,
  },
  message: {
    color: theme.colors.secondaryText,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 340,
  },
  actions: {
    width: '100%',
    maxWidth: 340,
  },
  hint: {
    color: theme.colors.secondaryText,
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 340,
  },
});
