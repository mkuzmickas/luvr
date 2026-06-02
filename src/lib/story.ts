// Story-related helpers.

// The app no longer lets the user choose a writing style; every story uses this
// single register. The value still populates the writing_style column so nothing
// downstream breaks.
export const DEFAULT_WRITING_STYLE = 'explicit';

// Build the gender_config phrase the model expects, e.g. "a woman attracted to men".
export function buildGenderConfig(
  gender: string | null,
  attractedTo: string | null,
): string {
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
  const a = attractedTo
    ? attractedMap[attractedTo] ?? attractedTo.toLowerCase()
    : 'others';
  return `${g} attracted to ${a}`;
}
