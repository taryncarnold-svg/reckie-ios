import { supabase } from './supabase';
import {
  canonicalKeyForRec,
  type Category,
  type CosignWithProfile,
  type Profile,
  type Rec,
  type TopList,
  type TopListWithRecs,
  type Tried,
} from './types';

/** Data access mirrored from the web app's src/lib (activity.ts, fetch-people-directory.ts). */

export type ActivityItem = {
  rec: Rec;
  profile: Profile;
};

export async function fetchFollowingActivity(userId: string, limit = 30): Promise<ActivityItem[]> {
  const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
  const followingIds = follows?.map((f) => f.following_id) ?? [];
  if (followingIds.length === 0) return [];

  const [{ data: recs }, { data: profiles }] = await Promise.all([
    supabase
      .from('recs')
      .select('*')
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase.from('profiles').select('*').in('id', followingIds),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p as Profile]));
  return ((recs ?? []) as Rec[])
    .filter((rec) => profileMap.has(rec.user_id))
    .map((rec) => ({ rec, profile: profileMap.get(rec.user_id)! }));
}

export type PeopleMember = {
  profile: Profile;
  rec_count: number;
  cosign_count: number;
  recent_picks: { title: string; category: Category }[];
  is_following: boolean;
};

export async function fetchPeopleDirectory(currentUserId: string): Promise<PeopleMember[]> {
  const [{ data: profiles }, { data: follows }, { data: recs }, { data: cosignRows }] = await Promise.all([
    supabase.from('profiles').select('*').neq('id', currentUserId).order('created_at', { ascending: false }),
    supabase.from('follows').select('following_id').eq('follower_id', currentUserId),
    supabase.from('recs').select('user_id, title, category, created_at').order('created_at', { ascending: false }),
    supabase.from('cosigns').select('user_id, rec:recs!inner(user_id)'),
  ]);

  if (!profiles?.length) return [];

  const followingSet = new Set((follows ?? []).map((f) => f.following_id));
  const countMap = new Map<string, number>();
  const recentByUser = new Map<string, { title: string; category: Category }[]>();
  for (const rec of recs ?? []) {
    countMap.set(rec.user_id, (countMap.get(rec.user_id) ?? 0) + 1);
    const list = recentByUser.get(rec.user_id) ?? [];
    if (list.length < 3) {
      list.push({ title: rec.title, category: rec.category as Category });
      recentByUser.set(rec.user_id, list);
    }
  }

  // Co-signs received per person (self co-signs excluded) — the hero number.
  const cosignMap = new Map<string, number>();
  for (const row of (cosignRows ?? []) as unknown as { user_id: string; rec: { user_id: string } }[]) {
    if (row.user_id === row.rec.user_id) continue;
    cosignMap.set(row.rec.user_id, (cosignMap.get(row.rec.user_id) ?? 0) + 1);
  }

  return (profiles as Profile[])
    .map((profile) => ({
      profile,
      rec_count: countMap.get(profile.id) ?? 0,
      cosign_count: cosignMap.get(profile.id) ?? 0,
      recent_picks: recentByUser.get(profile.id) ?? [],
      is_following: followingSet.has(profile.id),
    }))
    .sort((a, b) => (a.profile.name ?? '').localeCompare(b.profile.name ?? ''));
}

export function filterPeople(members: PeopleMember[], query: string): PeopleMember[] {
  const term = query.trim().toLowerCase().replace(/^@/, '');
  if (!term) return members;
  return members.filter(
    (m) =>
      (m.profile.name ?? '').toLowerCase().includes(term) ||
      (m.profile.handle ?? '').toLowerCase().includes(term)
  );
}

export async function setFollowing(currentUserId: string, targetId: string, follow: boolean): Promise<void> {
  if (follow) {
    const { error } = await supabase
      .from('follows')
      .upsert({ follower_id: currentUserId, following_id: targetId }, { onConflict: 'follower_id,following_id' });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', currentUserId)
      .eq('following_id', targetId);
    if (error) throw error;
  }
}

export async function fetchSavedRecIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from('saves').select('rec_id').eq('user_id', userId);
  return new Set((data ?? []).map((row) => row.rec_id));
}

export async function setSaved(userId: string, rec: Pick<Rec, 'id' | 'canonical_id'>, saved: boolean): Promise<void> {
  if (saved) {
    const { error } = await supabase
      .from('saves')
      .upsert(
        { user_id: userId, rec_id: rec.id, canonical_id: canonicalKeyForRec(rec) },
        { onConflict: 'user_id,rec_id' }
      );
    if (error) throw error;
  } else {
    const { error } = await supabase.from('saves').delete().eq('user_id', userId).eq('rec_id', rec.id);
    if (error) throw error;
  }
}

export type SavedEntry = { rec: Rec; owner: Profile | null; saved_at: string };

/** Saved tab list — explicit FK hint avoids PostgREST embed ambiguity. */
export async function fetchSavedEntries(userId: string): Promise<SavedEntry[]> {
  const { data, error } = await supabase
    .from('saves')
    .select('created_at, rec:recs(*, profiles!recs_user_id_fkey(*))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    created_at: string;
    rec: (Rec & { profiles: Profile | null }) | null;
  }[];

  const entries: SavedEntry[] = [];
  for (const row of rows) {
    if (!row.rec) continue;
    const { profiles, ...rec } = row.rec;
    entries.push({ rec: rec as Rec, owner: profiles, saved_at: row.created_at });
  }
  return entries;
}

export async function deleteRec(userId: string, recId: string): Promise<void> {
  // Defensive user_id filter, same as all web mutations.
  const { error } = await supabase.from('recs').delete().eq('id', recId).eq('user_id', userId);
  if (error) throw error;
}

export async function fetchUserProfile(userId: string): Promise<{ profile: Profile | null; recs: Rec[] }> {
  const [{ data: profile }, { data: recs }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('recs').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
  ]);
  return { profile: (profile as Profile) ?? null, recs: (recs ?? []) as Rec[] };
}

// ============================================================
// Flywheel (migration 010): cosigns, tried, lineage
// ============================================================

/**
 * The co-sign stack for a reckie: everyone who backed this thing, oldest first.
 * Matches by canonical group so co-signs aggregate across copies of the same
 * real-world thing, and by reckie_id to catch rows whose canonical seed is this rec.
 */
export async function fetchCosignStack(rec: Pick<Rec, 'id' | 'canonical_id'>): Promise<CosignWithProfile[]> {
  const key = canonicalKeyForRec(rec);
  const { data, error } = await supabase
    .from('cosigns')
    .select('*, profile:profiles(*)')
    .or(`canonical_id.eq.${key},reckie_id.eq.${rec.id}`)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as CosignWithProfile[];
}

/** Co-sign a reckie, optionally with a one-line take. One per person per thing. */
export async function addCosign(
  userId: string,
  rec: Pick<Rec, 'id' | 'canonical_id'>,
  note: string | null
): Promise<void> {
  const { error } = await supabase.from('cosigns').upsert(
    {
      user_id: userId,
      reckie_id: rec.id,
      canonical_id: canonicalKeyForRec(rec),
      note: note?.trim() || null,
    },
    { onConflict: 'user_id,reckie_id' }
  );
  if (error) {
    // 23505 = unique_violation on the partial (user_id, canonical_id) index:
    // they already co-signed another copy of this thing. Treat as already done.
    if (error.code === '23505') return;
    throw error;
  }
}

export async function removeCosign(userId: string, rec: Pick<Rec, 'id' | 'canonical_id'>): Promise<void> {
  const key = canonicalKeyForRec(rec);
  const { error } = await supabase
    .from('cosigns')
    .delete()
    .eq('user_id', userId)
    .or(`canonical_id.eq.${key},reckie_id.eq.${rec.id}`);
  if (error) throw error;
}

/** Canonical keys of everything the user has co-signed (for button state). */
export async function fetchMyCosignKeys(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from('cosigns').select('reckie_id, canonical_id').eq('user_id', userId);
  const keys = new Set<string>();
  for (const row of data ?? []) {
    keys.add(row.canonical_id ?? row.reckie_id);
  }
  return keys;
}

/**
 * THE HERO NUMBER (PRODUCT.md §5): co-signs received across all of a user's
 * reckies — how far their taste traveled.
 */
export async function fetchCosignsReceivedCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('cosigns')
    .select('id, rec:recs!inner(user_id)', { count: 'exact', head: true })
    .eq('rec.user_id', userId)
    .neq('user_id', userId); // self co-signs don't count toward the hero number
  return count ?? 0;
}

/** The user's tried row for one reckie (or another copy of the same thing). */
export async function fetchTriedForRec(userId: string, rec: Pick<Rec, 'id' | 'canonical_id'>): Promise<Tried | null> {
  const key = canonicalKeyForRec(rec);
  const { data } = await supabase
    .from('tried')
    .select('*')
    .eq('user_id', userId)
    .or(`canonical_id.eq.${key},reckie_id.eq.${rec.id}`)
    .limit(1)
    .maybeSingle();
  return (data as Tried) ?? null;
}

/** All of the user's tried rows, keyed by canonical key. Owner-only via RLS. */
export async function fetchTriedByKey(userId: string): Promise<Map<string, Tried>> {
  const { data } = await supabase.from('tried').select('*').eq('user_id', userId);
  const map = new Map<string, Tried>();
  for (const row of (data ?? []) as Tried[]) {
    map.set(row.canonical_id ?? row.reckie_id, row);
  }
  return map;
}

/** Mark "tried it", with the optional private note and quiet "loved" signal. */
export async function markTried(
  userId: string,
  rec: Pick<Rec, 'id' | 'canonical_id'>,
  options: { privateNote?: string | null; loved?: boolean | null } = {}
): Promise<void> {
  const { error } = await supabase.from('tried').upsert(
    {
      user_id: userId,
      reckie_id: rec.id,
      canonical_id: canonicalKeyForRec(rec),
      private_note: options.privateNote?.trim() || null,
      loved: options.loved ?? null,
    },
    { onConflict: 'user_id,reckie_id' }
  );
  if (error && error.code !== '23505') throw error;
}

export async function unmarkTried(userId: string, rec: Pick<Rec, 'id' | 'canonical_id'>): Promise<void> {
  const key = canonicalKeyForRec(rec);
  const { error } = await supabase
    .from('tried')
    .delete()
    .eq('user_id', userId)
    .or(`canonical_id.eq.${key},reckie_id.eq.${rec.id}`);
  if (error) throw error;
}

/**
 * "Reckie it" — pass someone's reckie on as your own (PRODUCT.md §2, §7).
 * Copies the thing, records lineage via source_reckie_id, joins the canonical
 * group, and co-signs the original. Returns the new rec's id.
 */
export async function passOnReckie(userId: string, source: Rec, note: string): Promise<string> {
  const canonical = canonicalKeyForRec(source);

  const { data, error } = await supabase
    .from('recs')
    .insert({
      user_id: userId,
      title: source.title,
      category: source.category,
      city: source.city,
      note: note.trim() || null,
      tags: null,
      cover_image_url: source.cover_image_url,
      image_url: source.image_url,
      external_id: source.external_id,
      external_source: source.external_source,
      external_rating_label: source.external_rating_label,
      external_rating_value: source.external_rating_value,
      primary_action_label: source.primary_action_label,
      primary_action_url: source.primary_action_url,
      secondary_action_label: source.secondary_action_label,
      secondary_action_url: source.secondary_action_url,
      source_label: source.source_label,
      source_url: source.source_url,
      metadata: source.metadata,
      source_reckie_id: source.id,
      canonical_id: canonical,
    })
    .select('id')
    .single();
  if (error) throw error;

  // Passing it on co-signs the original (PRODUCT.md §2: "reckie it = co-signs").
  await addCosign(userId, source, note);

  return data.id as string;
}

/**
 * Find the canonical group for an external thing (used by the add flow so a
 * fresh search-based add of e.g. "Sushi Park" joins the existing group).
 * Earliest rec wins as the group seed.
 */
export async function findCanonicalForExternal(
  externalId: string,
  externalSource: string
): Promise<string | null> {
  const { data } = await supabase
    .from('recs')
    .select('id, canonical_id')
    .eq('external_id', externalId)
    .eq('external_source', externalSource)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return data.canonical_id ?? data.id;
}

// ============================================================
// Top 3: optional ranked lists, one per category (max 3 items)
// ============================================================

export const TOP_LIST_LABELS: Record<Category, string> = {
  eat: 'Restaurants',
  drink: 'Bars',
  do: 'Things to Do',
  watch: 'Must-Watch',
  read: 'Reads',
  listen: 'Listens',
  play: 'Games',
};

export function topListTitle(category: Category): string {
  return `Top 3 ${TOP_LIST_LABELS[category]}`;
}

type TopListItemRow = { position: number; rec: Rec | null };

export async function fetchTopLists(userId: string): Promise<TopListWithRecs[]> {
  const { data: lists } = await supabase
    .from('top_lists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (!lists?.length) return [];

  const { data: items } = await supabase
    .from('top_list_items')
    .select('list_id, position, rec:recs(*)')
    .in('list_id', lists.map((l) => l.id))
    .order('position', { ascending: true });

  const byList = new Map<string, Rec[]>();
  for (const row of (items ?? []) as unknown as (TopListItemRow & { list_id: string })[]) {
    if (!row.rec) continue;
    const recs = byList.get(row.list_id) ?? [];
    recs.push(row.rec);
    byList.set(row.list_id, recs);
  }

  return (lists as TopList[])
    .map((list) => ({ list, recs: (byList.get(list.id) ?? []).slice(0, 3) }))
    .filter((entry) => entry.recs.length > 0);
}

/**
 * Replace the user's ranked list for a category with `recIds` in rank order.
 * An empty array deletes the list.
 */
export async function saveTopList(userId: string, category: Category, recIds: string[]): Promise<void> {
  if (recIds.length === 0) {
    const { error } = await supabase.from('top_lists').delete().eq('user_id', userId).eq('category', category);
    if (error) throw error;
    return;
  }

  const { data: list, error: listError } = await supabase
    .from('top_lists')
    .upsert(
      { user_id: userId, category, title: topListTitle(category) },
      { onConflict: 'user_id,category' }
    )
    .select('id')
    .single();
  if (listError) throw listError;

  const { error: clearError } = await supabase.from('top_list_items').delete().eq('list_id', list.id);
  if (clearError) throw clearError;

  const { error: insertError } = await supabase.from('top_list_items').insert(
    recIds.slice(0, 3).map((recId, index) => ({
      list_id: list.id,
      reckie_id: recId,
      position: index + 1,
    }))
  );
  if (insertError) throw insertError;
}

// ============================================================
// Home pulse (PRODUCT.md §5): reckies + co-signs only, capped, calm
// ============================================================

export type PulseItem =
  | { kind: 'reckie'; id: string; created_at: string; rec: Rec; profile: Profile }
  | {
      kind: 'cosign_payoff'; // someone co-signed YOUR reckie — the payoff
      id: string;
      created_at: string;
      rec: Rec;
      profile: Profile; // the co-signer
      note: string | null;
    };

export type CosignStamp = { title: string; rec: Rec; profiles: Profile[] };

export async function fetchPulse(
  userId: string,
  cap = 3
): Promise<{ items: PulseItem[]; stamp: CosignStamp | null }> {
  const [activity, { data: cosignRows }] = await Promise.all([
    fetchFollowingActivity(userId, 12),
    supabase
      .from('cosigns')
      .select('*, rec:recs!inner(*), profile:profiles(*)')
      .eq('rec.user_id', userId)
      .neq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const items: PulseItem[] = [];

  for (const entry of activity) {
    items.push({
      kind: 'reckie',
      id: `rec-${entry.rec.id}`,
      created_at: entry.rec.created_at,
      rec: entry.rec,
      profile: entry.profile,
    });
  }

  for (const row of (cosignRows ?? []) as unknown as (CosignWithProfile & { rec: Rec })[]) {
    if (!row.profile) continue;
    items.push({
      kind: 'cosign_payoff',
      id: `cosign-${row.id}`,
      created_at: row.created_at,
      rec: row.rec,
      profile: row.profile,
      note: row.note,
    });
  }

  items.sort((a, b) => b.created_at.localeCompare(a.created_at));

  // Co-sign stamp: a thing 2+ people in your circle have reckied (the one flourish).
  let stamp: CosignStamp | null = null;
  const groups = new Map<string, { rec: Rec; profiles: Map<string, Profile> }>();
  for (const entry of activity) {
    const key = canonicalKeyForRec(entry.rec);
    const group = groups.get(key) ?? { rec: entry.rec, profiles: new Map() };
    group.profiles.set(entry.profile.id, entry.profile);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    if (group.profiles.size >= 2 && (!stamp || group.profiles.size > stamp.profiles.length)) {
      stamp = { title: group.rec.title, rec: group.rec, profiles: [...group.profiles.values()] };
    }
  }

  return { items: items.slice(0, cap), stamp };
}

// ============================================================
// Circle Browse (PRODUCT.md §14.3): content-first circle lens
// ============================================================

export type CircleBrowseItem = {
  canonicalKey: string;
  rec: Rec;
  /** Distinct people in your circle who reckied this thing. */
  reckoners: Profile[];
  vouchCount: number;
  quote: string | null;
};

export const CLASSIC_MIN_VOUCHES = 3;

export function formatReckonerNames(profiles: Profile[], max = 4): string {
  const names = profiles.map((p) => p.name ?? p.handle ?? 'Someone').slice(0, max);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]} & ${names[2]}`;
  const rest = profiles.length - 3;
  return rest > 0
    ? `${names[0]}, ${names[1]}, ${names[2]} & ${rest} more`
    : `${names[0]}, ${names[1]} & ${names[2]}`;
}

/** Aggregate circle reckies by canonical thing; sort most-vouched first. */
export async function fetchCircleBrowse(userId: string): Promise<CircleBrowseItem[]> {
  const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
  const followingIds = follows?.map((f) => f.following_id) ?? [];
  if (followingIds.length === 0) return [];

  const [{ data: recs }, { data: profiles }] = await Promise.all([
    supabase.from('recs').select('*').in('user_id', followingIds).order('created_at', { ascending: false }),
    supabase.from('profiles').select('*').in('id', followingIds),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p as Profile]));
  const groups = new Map<
    string,
    { rec: Rec; profiles: Map<string, Profile>; notes: string[] }
  >();

  for (const rec of (recs ?? []) as Rec[]) {
    const profile = profileMap.get(rec.user_id);
    if (!profile) continue;
    const key = canonicalKeyForRec(rec);
    let group = groups.get(key);
    if (!group) {
      group = { rec, profiles: new Map(), notes: [] };
      groups.set(key, group);
    }
    group.profiles.set(profile.id, profile);
    if (rec.note?.trim()) group.notes.push(rec.note.trim());
  }

  return [...groups.values()]
    .map((group) => ({
      canonicalKey: canonicalKeyForRec(group.rec),
      rec: group.rec,
      reckoners: [...group.profiles.values()],
      vouchCount: group.profiles.size,
      quote: group.notes.sort((a, b) => b.length - a.length)[0] ?? null,
    }))
    .sort(
      (a, b) =>
        b.vouchCount - a.vouchCount || b.rec.created_at.localeCompare(a.rec.created_at)
    );
}

// ============================================================
// Search (people + reckies)
// ============================================================

export type SearchResults = {
  people: PeopleMember[];
  reckies: { rec: Rec; profile: Profile | null }[];
};

export async function searchEverything(userId: string, query: string): Promise<SearchResults> {
  const term = query.trim();
  if (term.length < 2) return { people: [], reckies: [] };
  const like = `%${term.replace(/[%_]/g, '')}%`;

  const [people, { data: recRows }] = await Promise.all([
    fetchPeopleDirectory(userId).then((members) => filterPeople(members, term).slice(0, 8)),
    supabase
      .from('recs')
      .select('*, profile:profiles(*)')
      .ilike('title', like)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const reckies = ((recRows ?? []) as (Rec & { profile: Profile | null })[]).map((row) => {
    const { profile, ...rec } = row;
    return { rec: rec as Rec, profile };
  });

  return { people, reckies };
}

/** The lineage chain above a reckie, walking source_reckie_id to the originator. */
export async function fetchLineage(rec: Rec, maxDepth = 10): Promise<{ rec: Rec; profile: Profile | null }[]> {
  const chain: { rec: Rec; profile: Profile | null }[] = [];
  let currentSourceId = rec.source_reckie_id;
  for (let depth = 0; currentSourceId && depth < maxDepth; depth++) {
    const { data } = await supabase
      .from('recs')
      .select('*, profile:profiles(*)')
      .eq('id', currentSourceId)
      .maybeSingle();
    if (!data) break;
    const { profile, ...sourceRec } = data as Rec & { profile: Profile | null };
    chain.push({ rec: sourceRec as Rec, profile });
    currentSourceId = (sourceRec as Rec).source_reckie_id;
  }
  return chain;
}
