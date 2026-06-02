// Shared app types.

export type Profile = {
  id: string;
  display_name: string | null;
  gender: string | null;
  attracted_to: string | null;
  writing_style: string | null;
  onboarding_complete: boolean;
};
