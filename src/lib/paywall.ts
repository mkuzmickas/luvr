// Paywall configuration and gating logic.
//
// No payment functionality lives here — only the rules that decide when the
// full insights are gated. When real payments are added later, the only change
// needed is to set profiles.is_premium = true on a successful purchase; this
// gating already reacts to that flag.

// Number of choices a non-premium user may make before their full insights lock.
export const FREE_CHOICE_LIMIT = 5;

// Whether the detailed insights should be shown as a locked teaser.
// Premium users are never locked. Non-premium users lock once they have made
// more than the free limit of choices.
export function isInsightsLocked(
  isPremium: boolean,
  sampleCount: number,
): boolean {
  return !isPremium && sampleCount > FREE_CHOICE_LIMIT;
}
