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
  tags?: string[] | null;
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

function tagsFromSearchResult(result: SearchResult): string[] | null {
  const tags = new Set<string>();
  for (const t of result.tags ?? []) if (t?.trim()) tags.add(t.trim());
  const m = result.metadata;
  if (m) {
    for (const key of ['genres', 'keywords', 'categories', 'cuisines'] as const) {
      const val = m[key];
      if (Array.isArray(val)) val.forEach((v) => typeof v === 'string' && tags.add(v));
    }
    if (typeof m.cuisine === 'string') tags.add(m.cuisine);
  }
  return tags.size ? [...tags] : null;
}

function normalizePlaceActions(result: SearchResult) {
  const isLocation =
    result.category === 'eat' || result.category === 'drink' || result.category === 'do';
  if (!isLocation) {
    return {
      primaryActionLabel: result.primaryActionLabel,
      primaryActionUrl: result.primaryActionUrl,
      secondaryActionLabel: result.secondaryActionLabel,
      secondaryActionUrl: result.secondaryActionUrl,
    };
  }

  let primaryLabel = result.primaryActionLabel;
  let primaryUrl = result.primaryActionUrl;
  let secondaryLabel = result.secondaryActionLabel;
  let secondaryUrl = result.secondaryActionUrl;
  const m = result.metadata ?? {};

  const reservationCandidates: { label: string; url: string }[] = [];
  const add = (label: string, url: unknown) => {
    if (typeof url === 'string' && url) reservationCandidates.push({ label, url });
  };
  add('Make a res', (m.reservation_url as string) ?? (m.opentable_url as string));
  add('Book on Resy', m.resy_url);
  add('Book on Tock', m.tock_url);
  add('Book on OpenTable', m.opentable_url);

  const isDirections = (label: string | null | undefined, url: string | null | undefined) =>
    !!label?.match(/direction|maps/i) || !!url?.match(/maps\.google|maps\.apple|goo\.gl\/maps/i);

  if (reservationCandidates.length > 0) {
    const best = reservationCandidates[0];
    if (isDirections(primaryLabel, primaryUrl) || !primaryLabel?.match(/reserv|book/i)) {
      secondaryLabel = primaryLabel;
      secondaryUrl = primaryUrl;
      primaryLabel = best.label;
      primaryUrl = best.url;
    }
  } else if (isDirections(primaryLabel, primaryUrl) && secondaryLabel && secondaryUrl) {
    [primaryLabel, primaryUrl, secondaryLabel, secondaryUrl] = [
      secondaryLabel,
      secondaryUrl,
      primaryLabel,
      primaryUrl,
    ];
  }

  return { primaryActionLabel: primaryLabel, primaryActionUrl: primaryUrl, secondaryActionLabel: secondaryLabel, secondaryActionUrl: secondaryUrl };
}

/** Mirror of web searchResultToPayload (src/lib/search/to-rec-payload.ts). */
export function searchResultToPayload(
  result: SearchResult,
  userId: string,
  note: string
): Omit<Rec, 'id' | 'created_at'> {
  const isLocation = result.category === 'eat' || result.category === 'drink' || result.category === 'do';
  const actions = normalizePlaceActions(result);
  const image =
    result.coverImageUrl ??
    result.imageUrl ??
    (result.metadata?.poster_url as string) ??
    (result.metadata?.artwork_url as string) ??
    (result.metadata?.thumbnail_url as string) ??
    null;

  return {
    user_id: userId,
    title: result.title,
    category: result.category,
    city: isLocation ? (result.city ?? null) : null,
    note: note.trim() || null,
    tags: tagsFromSearchResult(result),
    cover_image_url: image,
    image_url: result.imageUrl ?? result.coverImageUrl ?? image,
    external_id: result.externalId ?? null,
    external_source: result.externalSource ?? null,
    external_rating_label: result.externalRatingLabel ?? null,
    external_rating_value: result.externalRatingValue ?? null,
    primary_action_label: actions.primaryActionLabel ?? null,
    primary_action_url: actions.primaryActionUrl ?? null,
    secondary_action_label: actions.secondaryActionLabel ?? null,
    secondary_action_url: actions.secondaryActionUrl ?? null,
    source_label: result.sourceLabel ?? null,
    source_url: result.sourceUrl ?? null,
    metadata: result.metadata ?? null,
    source_reckie_id: null,
    canonical_id: null,
  };
}
