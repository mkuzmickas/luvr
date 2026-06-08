// Shared insights mapping logic: dimension columns -> user-facing brand names,
// the long interpretive copy, and short one-line descriptors for the share card.

export const MAX_SCORE = 10;

export const EROTIC = {
  key: 'Erotic Signature',
  columns: ['energetic', 'sensual', 'sexual', 'kinky', 'shapeshifter'],
  labels: ['The Spark', 'The Savorer', 'The Flame', 'The Explorer', 'The Shifter'],
};
export const ATTACHMENT = {
  key: 'Attachment Style',
  columns: ['secure', 'anxious', 'avoidant', 'fearful'],
  labels: ['Secure', 'Anxious', 'Avoidant', 'Fearful Avoidant'],
};
export const INTIMACY = {
  key: 'Intimacy Language',
  // "time" is a reserved word in SQL but is safe to read as a JSON key here.
  columns: ['words', 'acts', 'gifts', 'time', 'touch'],
  labels: ['Words', 'Acts', 'Gifts', 'Time', 'Touch'],
};

// Index of the highest-scoring dimension (the user's primary type).
export function primaryIndex(values: number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[best]) best = i;
  }
  return best;
}

// Full interpretive copy (used on the Insights screen).
export const DESCRIPTIONS: Record<string, string> = {
  'The Spark':
    'You crave anticipation — the electric charge of tension and energy that builds before a single touch. That live-wire current is where your desire truly comes alive.',
  'The Savorer':
    'You are drawn to the senses, the atmosphere, and the slow, luxurious build. For you, pleasure is something to be savored and stretched out, never rushed.',
  'The Flame':
    'You are direct and physically present, readily turned on by the act itself. Your desire is honest, immediate, and gloriously uncomplicated.',
  'The Explorer':
    'You are pulled toward intensity, power, and the thrill of the edge. You are unafraid to chase the experiences most people only imagine.',
  'The Shifter':
    'You crave variety and move fluidly between all the different energies. Your eroticism is expansive, adaptive, and impossible to put in a single box.',
  Secure:
    'You bond with trust, confidence, and an easy comfort in closeness. Connection feels like a safe harbor that you give and receive freely.',
  Anxious:
    'You bond with deep longing and a desire for reassurance and closeness. Your capacity to love intensely and wholeheartedly is a profound gift.',
  Avoidant:
    'You value independence, space, and self-reliance within connection. Your steadiness and quiet autonomy are magnetic in their own right.',
  'Fearful Avoidant':
    'You move between craving closeness and needing distance. That duality gives you a rich, deeply felt, and complex emotional world.',
  Words:
    'You give and receive love through affirmation and spoken desire. The right words land on you with the force of a touch.',
  Acts:
    'You express care through gestures, effort, and showing up. For you, love is something you do, not just something you say.',
  Gifts:
    'You connect through meaningful tokens and the art of giving. A single thoughtful object can carry your whole heart.',
  Time:
    'You bond through undivided presence and attention. Nothing says love to you like someone choosing simply to be with you.',
  Touch:
    'You connect most deeply through physical closeness. Skin to skin is where you feel most seen and understood.',
};

// Short one-line descriptors (used on the shareable result card).
export const SHORT_DESCRIPTORS: Record<string, string> = {
  'The Spark': 'Aroused by anticipation and electric tension',
  'The Savorer': 'Drawn to the senses and the slow build',
  'The Flame': 'Direct, physical, and readily turned on',
  'The Explorer': 'Pulled toward intensity and the edge',
  'The Shifter': 'Fluid across every kind of energy',
  Secure: 'Bonds with trust and easy closeness',
  Anxious: 'Loves deeply and craves reassurance',
  Avoidant: 'Values independence and space',
  'Fearful Avoidant': 'Craves closeness yet needs distance',
  Words: 'Connects through words and affirmation',
  Acts: 'Shows love through effort and action',
  Gifts: 'Connects through meaningful giving',
  Time: 'Bonds through undivided presence',
  Touch: 'Connects most through physical closeness',
};
