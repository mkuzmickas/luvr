// Shared app types.

export type Profile = {
  id: string;
  display_name: string | null;
  gender: string | null;
  attracted_to: string | null;
  writing_style: string | null;
  onboarding_complete: boolean;
};

// An already-created story plus the parameters needed to generate its segments.
export type StoryParams = {
  storyId: string;
  userId: string;
  setting: string | null;
  customPrompt: string | null;
  writingStyle: string;
  genderConfig: string;
};
