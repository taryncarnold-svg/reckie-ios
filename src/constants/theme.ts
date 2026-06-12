import { Platform } from 'react-native';

import type { Category } from '@/lib/types';

/**
 * Design tokens per DESIGN.md: white base, warm ink, oxblood + marigold as
 * punctuation. Never pure #000 ink, never cold grey secondary text.
 */
export const Colors = {
  // Base field
  white: '#FFFFFF',
  paper: '#FBFAF8',
  line: '#ECEAE5',
  lineSoft: '#F3F1EC',
  ink: '#1C1A17',
  ink2: '#6B6660',
  ink3: '#9C968D',

  // Accents — punctuation, 1–2 hits per screen
  oxblood: '#8B3A2F',
  oxbloodDeep: '#6E2B22',
  oxbloodSoft: '#FBF0EE',
  marigold: '#D99A2B',
  marigoldDeep: '#B97D15',
  marigoldSoft: '#FBF3E2',

  // Legacy aliases (older screens reference these; design pass will migrate them)
  background: '#FFFFFF',
  foreground: '#1C1A17',
  card: '#FBFAF8',
  accent: '#8B3A2F',
  muted: '#6B6660',
  border: '#ECEAE5',
  borderStrong: 'rgba(28, 26, 23, 0.14)',
  overlay: 'rgba(28, 26, 23, 0.45)',
} as const;

/** Muted, low-saturation category tints ("faded postcard"). */
export const CategoryTints: Record<Category | 'shop', string> = {
  eat: '#C46B4A',
  drink: '#6E8499',
  do: '#6E8E78',
  watch: '#5B5470',
  read: '#B8985E',
  play: '#6E9079',
  listen: '#7E6E99', // not in DESIGN.md palette; matched to the same saturation
  shop: '#9A7B8E',
};

export const Fonts = {
  /** Inter — the workhorse. All UI. */
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  /** Fraunces — rare guest: wordmark, names, display titles, the note. */
  display: 'Fraunces_600SemiBold',
  note: 'Fraunces_400Regular',
  /** Legacy aliases (system fonts) — design pass will migrate remaining uses. */
  serif: Platform.select({ ios: 'ui-serif', default: 'serif' })!,
  rounded: Platform.select({ ios: 'ui-rounded', default: 'normal' })!,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** DESIGN.md §4: cards 16, tiles/inputs 13–14, pills full, buttons 13. */
export const Radii = {
  sm: 8,
  input: 13,
  button: 13,
  md: 14,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;
