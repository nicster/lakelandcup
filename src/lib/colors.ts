// Shared color tokens for runtime JS. Mirrors the `lake.*` palette in
// `tailwind.config.ts` — kept as hex (not OKLCH) because RetiredJersey's
// contrast detection parses the values with `parseInt(..., 16)`. Keep these
// hex values in sync with the OKLCH counterparts in the Tailwind config.

export const lake = {
  red: '#c41e3a',
  redDark: '#9a1830',
  blue: '#1e3a5f',
  blueDark: '#152942',
  blueDarkest: '#0f1419',
  blueLight: '#2a4a73',
  gold: '#c9a227',
  goldBright: '#f0c020',
  ice: '#e8f4f8',
  iceMuted: '#a7b1b5',
  success: '#5a8a6c',
  warning: '#d4a017',
  error: '#c41e3a',
  silver: '#c5cdd1',
  bronze: '#a87142',
  goalie: '#9a86c4',
} as const;

// Last-resort contrast fallbacks used when neither of an arbitrary input's
// candidate colors meets a sufficient luminance delta against the background.
// Only RetiredJersey uses these; not part of the brand palette.
export const contrast = {
  light: '#ffffff',
  dark: '#000000',
  textDark: '#1a1a1a',
} as const;
