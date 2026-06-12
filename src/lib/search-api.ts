import type { Category, Rec, ReckieMetadata } from './types';

/**
 * External search runs through the production web app's API
 * (https://myreckie.com/api/search/reckies) so all provider keys stay
 * server-side on Vercel. Shapes mirror reckie-web src/lib/search + shelves.ts.
 */

const API_BASE = 'https://myreckie.com';

export type AddPickKind =
  | 'eat'
  | 'drink'
  | 'do'
  | 'movie'
  | 'show'
  | 'video'
  | 'podcast'
  | 'album'
  | 'song'
  | 'book'
  | 'game';

export const ADD_PICK_SECTIONS: { title: string; options: AddPickKind[] }[] = [
  { title: 'Go', options: ['eat', 'drink', 'do'] },
  { title: 'Watch', options: ['movie', 'show', 'video'] },
  { title: 'Listen', options: ['podcast', 'album', 'song'] },
  { title: 'More', options: ['book', 'game'] },
];

export const ADD_PICK_OPTIONS: Record<AddPickKind, { label: string; emoji: string; dbCategory: Category }> = {
  eat: { label: 'Eat', emoji: '🍽', dbCategory: 'eat' },
  drink: { label: 'Drink', emoji: '🍸', dbCategory: 'drink' },
  do: { label: 'Do', emoji: '🧭', dbCategory: 'do' },
  movie: { label: 'Movie', emoji: '🎬', dbCategory: 'watch' },
  show: { label: 'Show', emoji: '📺', dbCategory: 'watch' },
  video: { label: 'Video', emoji: '▶️', dbCategory: 'watch' },
  podcast: { label: 'Podcast', emoji: '🎙', dbCategory: 'listen' },
  album: { label: 'Album', emoji: '💿', dbCategory: 'listen' },
  song: { label: 'Song', emoji: '🎵', dbCategory: 'listen' },
  book: { label: 'Book', emoji: '📚', dbCategory: 'read' },
  game: { label: 'Game', emoji: '🎮', dbCategory: 'play' },
};

export type SearchResult = {
  id: string;
  title: string;
  category: Category;
  context: string;
  coverImageUrl: string | null;
  imageUrl?: string | null;
  city?: string | null;
  externalId?: string | null;
  externalSource?: string | null;
  externalRatingLabel?: string | null;
  externalRatingValue?: string | null;
  primaryActionLabel?: string | null;
  primaryActionUrl?: string | null;
  secondaryActionLabel?: string | null;
  secondaryActionUrl?: string | null;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
  metadata?: ReckieMetadata | null;
  provider: string;
};

export async function searchReckies(
  query: string,
  pickKind: AddPickKind,
  signal?: AbortSignal
): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `${API_BASE}/api/search/reckies?q=${encodeURIComponent(q)}&pickKind=${pickKind}`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Search failed');
  const json = (await response.json()) as { results?: SearchResult[] };
  return json.results ?? [];
}

/** Mirror of web searchResultToPayload (src/lib/search/to-rec-payload.ts). */
export function searchResultToPayload(
  result: SearchResult,
  userId: string,
  note: string
): Omit<Rec, 'id' | 'created_at'> {
  const isLocation = result.category === 'eat' || result.category === 'drink' || result.category === 'do';
  return {
    user_id: userId,
    title: result.title,
    category: result.category,
    city: isLocation ? (result.city ?? null) : null,
    note: note.trim() || null,
    tags: null,
    cover_image_url: result.coverImageUrl ?? result.imageUrl ?? null,
    image_url: result.imageUrl ?? result.coverImageUrl ?? null,
    external_id: result.externalId ?? null,
    external_source: result.externalSource ?? null,
    external_rating_label: result.externalRatingLabel ?? null,
    external_rating_value: result.externalRatingValue ?? null,
    primary_action_label: result.primaryActionLabel ?? null,
    primary_action_url: result.primaryActionUrl ?? null,
    secondary_action_label: result.secondaryActionLabel ?? null,
    secondary_action_url: result.secondaryActionUrl ?? null,
    source_label: result.sourceLabel ?? null,
    source_url: result.sourceUrl ?? null,
    metadata: result.metadata ?? null,
    // Lineage fields: a search-based add has no source reckie; canonical_id is
    // resolved at save time via findCanonicalForExternal (null = own seed).
    source_reckie_id: null,
    canonical_id: null,
  };
}
