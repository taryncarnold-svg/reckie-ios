import type { Category, Rec } from './types';

/**
 * Category system mirrored from the web app (src/lib/categories.ts there).
 * 7 DB categories grouped into 5 top-level shelves.
 * Language rules: "Go" not "Places", "Shows" not "TV Shows", "reckies" not "recs".
 */

export const CATEGORY_EMOJI: Record<Category, string> = {
  eat: '🍽️',
  drink: '🍸',
  do: '🎟️',
  watch: '🎬',
  read: '📚',
  play: '🎮',
  listen: '🎧',
};

export type TopShelfId = 'go' | 'watch' | 'listen' | 'read' | 'play';

export const TOP_SHELVES: {
  id: TopShelfId;
  label: string;
  emoji: string;
  tagline: string;
  categories: Category[];
}[] = [
  { id: 'go', label: 'Go', emoji: '📍', tagline: 'Restaurants, bars, and spots', categories: ['eat', 'drink', 'do'] },
  { id: 'watch', label: 'Watch', emoji: '🎬', tagline: 'Movies, shows, and videos', categories: ['watch'] },
  { id: 'listen', label: 'Listen', emoji: '🎧', tagline: 'Podcasts, songs, and albums', categories: ['listen'] },
  { id: 'read', label: 'Read', emoji: '📚', tagline: 'Books and articles', categories: ['read'] },
  { id: 'play', label: 'Play', emoji: '🎮', tagline: 'Games worth your time', categories: ['play'] },
];

export const LOCATION_CATEGORIES: Category[] = ['eat', 'drink', 'do'];

export function isLocationCategory(category: Category): boolean {
  return LOCATION_CATEGORIES.includes(category);
}

/** Portrait (2:3) covers: watch/read. Square: listen/play. Landscape: eat/drink/do. */
export function isPortraitCategory(category: Category): boolean {
  return category === 'watch' || category === 'read';
}

/** Native art ratio per DESIGN.md §3 — width / height for `aspectRatio` style. */
export function aspectRatioForCategory(category: Category): number {
  if (category === 'watch' || category === 'read') return 2 / 3;
  if (category === 'eat' || category === 'drink' || category === 'do') return 4 / 3;
  return 1;
}

/** Horizontal-scroll tile widths from reckie-shapes-and-grid.html. */
export function catalogueTileWidth(category: Category | 'place'): number {
  if (category === 'place') return 180;
  if (category === 'listen' || category === 'play') return 128;
  return 120;
}

export function normalizeCityKey(city: string): string {
  return city.trim().toLowerCase();
}

export type CityGroup = { city: string; recs: Rec[] };

export function groupRecsByCity(recs: Rec[]): CityGroup[] {
  const groups = new Map<string, CityGroup>();
  for (const rec of recs) {
    if (!isLocationCategory(rec.category) || !rec.city) continue;
    const key = normalizeCityKey(rec.city);
    const existing = groups.get(key);
    if (existing) {
      existing.recs.push(rec);
    } else {
      groups.set(key, { city: rec.city.trim(), recs: [rec] });
    }
  }
  return [...groups.values()].sort((a, b) => b.recs.length - a.recs.length);
}
