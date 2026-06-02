// Story-related helpers.

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
