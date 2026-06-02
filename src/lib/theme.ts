/**
 * Centralized design tokens for the LUVR app.
 *
 * This file is the SINGLE SOURCE OF TRUTH for all colors used across the app.
 * Every component must import colors from here rather than hardcoding hex values.
 */
export const theme = {
  colors: {
    /** App background */
    background: '#0a1414',
    /** Raised surfaces (cards, sheets, inputs) */
    surface: '#122020',
    /** Primary text */
    primaryText: '#EAF4F2',
    /** Secondary / muted text */
    secondaryText: '#7E9A98',
    /** Teal accent */
    tealAccent: '#2E8B8B',
    /** Bright teal (highlights, active states) */
    brightTeal: '#4FD1C5',
    /** Borders and dividers */
    border: '#1E3535',
  },
} as const;

export type Theme = typeof theme;
export default theme;
