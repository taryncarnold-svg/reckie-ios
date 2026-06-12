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

/** Circle Browse category pills (PRODUCT.md §14.3). */
export type CircleBrowseFilter = 'all' | 'watch' | 'listen' | 'read' | 'places' | 'play';

export const CIRCLE_BROWSE_FILTERS: { id: CircleBrowseFilter; label: string; emoji?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'watch', label: 'Watch', emoji: '🎬' },
  { id: 'listen', label: 'Listen', emoji: '🎧' },
  { id: 'read', label: 'Read', emoji: '📚' },
  { id: 'places', label: 'Places', emoji: '📍' },
  { id: 'play', label: 'Play', emoji: '🎮' },
];

export function recMatchesBrowseFilter(rec: Rec, filter: CircleBrowseFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'places') return isLocationCategory(rec.category);
  return rec.category === filter;
}

export function browseFilterLabel(filter: CircleBrowseFilter): string {
  return CIRCLE_BROWSE_FILTERS.find((f) => f.id === filter)?.label ?? 'All';
}

export const LOCATION_CATEGORIES_LIST: Category[] = ['eat', 'drink', 'do'];

export function locationCategoryLabel(category: Category): string {
  const labels: Record<string, string> = { eat: 'Restaurants', drink: 'Bars', do: 'Things to Do' };
  return labels[category] ?? category;
}

export type CatalogueSubsection = { id: string; label: string; match: (rec: Rec) => boolean };

function watchIsMovie(rec: Rec): boolean {
  const t = String(rec.metadata?.type ?? '').toLowerCase();
  return t === 'movie' || t === 'film' || t === 'video';
}

function watchIsShow(rec: Rec): boolean {
  const t = String(rec.metadata?.type ?? '').toLowerCase();
  return t === 'series' || t === 'show' || t === 'tv';
}

export function subsectionsForShelf(shelfId: TopShelfId): CatalogueSubsection[] | null {
  switch (shelfId) {
    case 'watch':
      return [
        { id: 'shows', label: 'Shows', match: (rec) => watchIsShow(rec) || !watchIsMovie(rec) },
        { id: 'movies', label: 'Movies', match: (rec) => watchIsMovie(rec) },
      ];
    case 'listen':
      return [
        { id: 'music', label: 'Music', match: (rec) => String(rec.metadata?.type ?? '').toLowerCase() !== 'podcast' },
        { id: 'podcasts', label: 'Podcasts', match: (rec) => String(rec.metadata?.type ?? '').toLowerCase() === 'podcast' },
      ];
    case 'read':
      return [
        { id: 'books', label: 'Books', match: (rec) => String(rec.metadata?.type ?? '').toLowerCase() !== 'article' },
        { id: 'articles', label: 'Articles', match: (rec) => String(rec.metadata?.type ?? '').toLowerCase() === 'article' },
      ];
    default:
      return null;
  }
}

export function groupBrowseItemsByCity<T extends { rec: Rec }>(items: T[]): { city: string; items: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const city = item.rec.city?.trim();
    if (!city) continue;
    const key = normalizeCityKey(city);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .map(([, list]) => ({ city: list[0].rec.city!.trim(), items: list }))
    .sort((a, b) => b.items.length - a.items.length);
}

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
