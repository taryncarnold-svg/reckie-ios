import { isLocationCategory } from './categories';
import type { Rec, ReckieMetadata } from './types';

const IMAGE_KEYS = [
  'artwork_url',
  'poster_url',
  'poster',
  'thumbnail_url',
  'thumbnail',
  'image_url',
  'image',
  'photo_url',
  'cover_url',
  'cover_image_url',
] as const;

const RESERVATION_RE = /opentable|resy|tock|sevenrooms|yelp\.com\/reservations|exploretock/i;
const DIRECTIONS_RE = /directions|maps\.google|maps\.apple|goo\.gl\/maps/i;

export function getRecImageUrl(rec: Rec): string | null {
  if (rec.image_url?.trim()) return rec.image_url.trim();
  if (rec.cover_image_url?.trim()) return rec.cover_image_url.trim();
  const m = rec.metadata;
  if (!m) return null;
  for (const key of IMAGE_KEYS) {
    const val = m[key as keyof ReckieMetadata];
    if (typeof val === 'string' && val.trim()) return val.trim();
  }
  return null;
}

function pushTag(set: Set<string>, value: unknown) {
  if (typeof value === 'string' && value.trim()) set.add(value.trim());
}

function pushTagList(set: Set<string>, value: unknown) {
  if (!Array.isArray(value)) return;
  for (const item of value) {
    if (typeof item === 'string') pushTag(set, item);
    else if (item && typeof item === 'object' && 'name' in item && typeof item.name === 'string') {
      pushTag(set, item.name);
    }
  }
}

/** Keyword tags for detail cards — genres, cuisine, provider cues, etc. */
export function extractDisplayTags(rec: Rec): string[] {
  const tags = new Set<string>();
  for (const t of rec.tags ?? []) pushTag(tags, t);

  const m = rec.metadata;
  if (m) {
    pushTagList(tags, m.genres);
    pushTagList(tags, m.keywords);
    pushTagList(tags, m.categories);
    pushTag(tags, m.cuisine);
    pushTagList(tags, m.cuisines);
    pushTag(tags, m.subtitle);
    if (m.type === 'series' || m.type === 'show') pushTag(tags, 'Series');
    if (m.type === 'movie' || m.type === 'film') pushTag(tags, 'Film');
    if (m.type === 'podcast') pushTag(tags, 'Podcast');
    if (m.type === 'album') pushTag(tags, 'Album');
    if (m.type === 'song') pushTag(tags, 'Song');
    if (m.type === 'article') pushTag(tags, 'Article');
    if (m.type === 'book') pushTag(tags, 'Book');
  }

  return [...tags].slice(0, 10);
}

export type RecSmartAction = { label: string; url: string };

/** Reservation-first for places; never surface directions as the primary CTA. */
export function getRecSmartActions(rec: Rec): {
  primary: RecSmartAction | null;
  secondary: RecSmartAction | null;
} {
  const candidates: RecSmartAction[] = [];

  const add = (label: string | null | undefined, url: string | null | undefined) => {
    if (label?.trim() && url?.trim()) candidates.push({ label: label.trim(), url: url.trim() });
  };

  add(rec.primary_action_label, rec.primary_action_url);
  add(rec.secondary_action_label, rec.secondary_action_url);

  const m = rec.metadata;
  if (m) {
    add('Make a res', (m.reservation_url as string) ?? (m.opentable_url as string));
    add('Book on Resy', m.resy_url as string);
    add('Book on Tock', m.tock_url as string);
    add('Book on OpenTable', m.opentable_url as string);
    add('Watch on ' + String(m.watch_provider ?? ''), m.watch_url as string);
    add('Listen on ' + String(m.listen_provider ?? ''), m.listen_url as string);
  }

  if (!isLocationCategory(rec.category)) {
    return {
      primary: candidates[0] ?? null,
      secondary: candidates[1] ?? null,
    };
  }

  const reservation = candidates.find(
    (c) =>
      RESERVATION_RE.test(c.url) ||
      /reserv|book a table|make a res|book on/i.test(c.label)
  );
  const directions = candidates.find(
    (c) => DIRECTIONS_RE.test(c.url) || /direction|open in maps|get directions/i.test(c.label)
  );
  const other = candidates.filter((c) => c !== reservation && c !== directions);

  if (reservation) {
    return {
      primary: { label: reservation.label.match(/book|reserv/i) ? reservation.label : 'Make a res', url: reservation.url },
      secondary: directions ?? other[0] ?? null,
    };
  }

  // No reservation link — use first non-directions action
  const nonDirections = candidates.find(
    (c) => !DIRECTIONS_RE.test(c.url) && !/direction|open in maps/i.test(c.label)
  );
  return {
    primary: nonDirections ?? null,
    secondary: directions ?? null,
  };
}

export function externalScoreTag(rec: Rec): string | null {
  if (rec.external_rating_label && rec.external_rating_value) {
    return `${rec.external_rating_label} ${rec.external_rating_value}`;
  }
  return null;
}

export function displayTagsForRec(rec: Rec): string[] {
  const score = externalScoreTag(rec);
  const tags = extractDisplayTags(rec);
  if (score && !tags.some((t) => t.includes(score))) tags.push(score);
  return tags;
}
