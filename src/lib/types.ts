/** Mirrors the web app's Supabase schema (see reckie-web CLAUDE.md). */

export type Category = 'eat' | 'drink' | 'do' | 'watch' | 'read' | 'play' | 'listen';

export type ReckieMetadata = {
  type?: string;
  year?: string | number;
  artist?: string;
  author?: string;
  artwork_url?: string;
  poster_url?: string;
  poster?: string;
  watch_provider?: string;
  watch_url?: string;
  listen_url?: string;
  listen_provider?: string;
  available_on?: string[];
  imdb_rating?: string;
  rotten_tomatoes?: string;
  google_rating?: string;
  directions_url?: string;
  [key: string]: unknown;
};

export type Profile = {
  id: string;
  name: string | null;
  handle: string | null;
  avatar_color: string | null;
  avatar_url: string | null;
  /** "Your taste in one line" (migration 010). */
  bio: string | null;
  created_at: string;
};

export type Rec = {
  id: string;
  user_id: string;
  created_at: string;
  title: string;
  category: Category;
  city: string | null;
  note: string | null;
  tags: string[] | null;
  cover_image_url: string | null;
  image_url: string | null;
  external_id: string | null;
  external_source: string | null;
  external_rating_label: string | null;
  external_rating_value: string | null;
  primary_action_label: string | null;
  primary_action_url: string | null;
  secondary_action_label: string | null;
  secondary_action_url: string | null;
  source_label: string | null;
  source_url: string | null;
  metadata: ReckieMetadata | null;
  /** LINEAGE (migration 010): the reckie this one was passed on from. */
  source_reckie_id: string | null;
  /** Groups all reckies of the same real-world thing (migration 010). */
  canonical_id: string | null;
};

/**
 * The canonical group key for a rec. Recs created before migration 010 have a
 * NULL canonical_id; they act as the seed of their own canonical group, so the
 * rec's own id is the key. Use this everywhere cosigns/saves/tried are keyed.
 */
export function canonicalKeyForRec(rec: Pick<Rec, 'id' | 'canonical_id'>): string {
  return rec.canonical_id ?? rec.id;
}

/** A co-sign: backing someone's reckie, optionally with a one-line take. */
export type Cosign = {
  id: string;
  reckie_id: string;
  canonical_id: string | null;
  user_id: string;
  note: string | null;
  created_at: string;
};

export type CosignWithProfile = Cosign & { profile: Profile | null };

/** "Tried it" — owner-only (private life-log seed). */
export type Tried = {
  id: string;
  user_id: string;
  reckie_id: string;
  canonical_id: string | null;
  private_note: string | null;
  loved: boolean | null;
  tried_at: string;
};

export type SavedReckie = {
  rec: Rec;
  owner: Profile | null;
};

/** Top 8 — the optional ranked list, one per category (migration 011). */
export type TopList = {
  id: string;
  user_id: string;
  category: Category;
  title: string;
  created_at: string;
};

export type TopListWithRecs = {
  list: TopList;
  /** Ordered by position ascending. */
  recs: Rec[];
};

import { getRecImageUrl as resolveRecImageUrl } from './rec-display';

export function getRecImageUrl(rec: Rec): string | null {
  return resolveRecImageUrl(rec);
}
