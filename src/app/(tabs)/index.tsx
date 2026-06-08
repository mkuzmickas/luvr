// Story tab — houses the setup -> reader flow.
// A fully onboarded user first sees the setup screen to choose a setting or
// custom fantasy, then proceeds into the reader for the story they begin.

import { useState } from 'react';

import { useAuth } from '@/lib/auth';
import { StoryParams } from '@/lib/types';
import StoryReaderScreen from '@/screens/StoryReaderScreen';
import StorySetupScreen from '@/screens/StorySetupScreen';

export default function StoryTab() {
  const { profile } = useAuth();
  const [activeStory, setActiveStory] = useState<StoryParams | null>(null);

  // The tab layout guarantees status === 'ready', so profile is present.
  if (!profile) return null;

  if (activeStory) {
    return (
      <StoryReaderScreen story={activeStory} onExit={() => setActiveStory(null)} />
    );
  }

  return <StorySetupScreen profile={profile} onBegin={(s) => setActiveStory(s)} />;
}
