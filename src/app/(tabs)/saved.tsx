import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BlurHeader, useHeaderHeight } from '@/components/blur-header';
import { PressableScale } from '@/components/pressable-scale';
import { useReckieDetail } from '@/components/reckie-detail-sheet';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { Colors, Fonts, Radii } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { CATEGORY_EMOJI, isLocationCategory, normalizeCityKey } from '@/lib/categories';
import { fetchTriedByKey, markTried, unmarkTried } from '@/lib/data';
import { notifyDataChanged, useDataChanged } from '@/lib/refresh';
import { supabase } from '@/lib/supabase';
import { canonicalKeyForRec, getRecImageUrl, type Profile, type Rec, type Tried } from '@/lib/types';

type SavedEntry = { rec: Rec; owner: Profile | null };
type SavedRow = { rec: (Rec & { owner: Profile | null }) | null };

/**
 * Saved (PRODUCT.md §5): the to-do list of your taste life. Filterable by
 * city and category, each item one tap from "I tried this".
 */
export default function SavedScreen() {
  const { session } = useAuth();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { openReckie } = useReckieDetail();

  const [entries, setEntries] = useState<SavedEntry[]>([]);
  const [triedByKey, setTriedByKey] = useState<Map<string, Tried>>(new Map());
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const userId = session?.user.id;

  const load = useCallback(async () => {
    if (!userId) return;
    const [{ data }, tried] = await Promise.all([
      supabase
        .from('saves')
        .select('rec:recs(*, owner:profiles(*))')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      fetchTriedByKey(userId),
    ]);

    const rows = (data ?? []) as unknown as SavedRow[];
    const next: SavedEntry[] = [];
    for (const row of rows) {
      if (!row.rec) continue;
      const { owner, ...rec } = row.rec;
      next.push({ rec: rec as Rec, owner });
    }
    setEntries(next);
    setTriedByKey(tried);
    setLoaded(true);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useDataChanged(load);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Filter pills: All, then each city, then each non-place category present.
  const filterOptions = useMemo(() => {
    const cities = new Map<string, string>();
    const categories = new Map<string, string>();
    for (const { rec } of entries) {
      if (isLocationCategory(rec.category) && rec.city) {
        cities.set(`city:${normalizeCityKey(rec.city)}`, rec.city);
      } else if (!isLocationCategory(rec.category)) {
        categories.set(
          `cat:${rec.category}`,
          rec.category.charAt(0).toUpperCase() + rec.category.slice(1)
        );
      }
    }
    return [
      { id: 'all', label: 'All' },
      ...[...cities.entries()].map(([id, label]) => ({ id, label })),
      ...[...categories.entries()].map(([id, label]) => ({ id, label })),
    ];
  }, [entries]);

  const visible = useMemo(() => {
    if (filter === 'all') return entries;
    if (filter.startsWith('city:')) {
      const key = filter.slice(5);
      return entries.filter(({ rec }) => rec.city && normalizeCityKey(rec.city) === key);
    }
    const category = filter.slice(4);
    return entries.filter(({ rec }) => rec.category === category);
  }, [entries, filter]);

  const toggleTried = async (rec: Rec) => {
    if (!userId) return;
    const key = canonicalKeyForRec(rec);
    const wasTried = triedByKey.has(key);
    // optimistic
    setTriedByKey((prev) => {
      const next = new Map(prev);
      if (wasTried) next.delete(key);
      else next.set(key, { id: 'optimistic', user_id: userId, reckie_id: rec.id, canonical_id: key, private_note: null, loved: null, tried_at: new Date().toISOString() });
      return next;
    });
    try {
      if (wasTried) await unmarkTried(userId, rec);
      else {
        await markTried(userId, rec);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      notifyDataChanged();
    } catch {
      load();
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + 16,
          paddingBottom: tabBarHeight + 32,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} progressViewOffset={headerHeight} />
        }>
        {filterOptions.length > 1 && (
          <View style={styles.filters}>
            <SegmentedTabs options={filterOptions} value={filter} onChange={setFilter} />
          </View>
        )}

        <View style={styles.list}>
          {visible.map(({ rec, owner }) => {
            const tried = triedByKey.has(canonicalKeyForRec(rec));
            const imageUrl = getRecImageUrl(rec);
            const ownerName = owner?.name ?? owner?.handle;
            return (
              <PressableScale
                key={rec.id}
                style={styles.row}
                haptic="light"
                onPress={() => openReckie({ rec, onChanged: load })}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.thumb} contentFit="cover" transition={150} />
                ) : (
                  <View style={[styles.thumb, styles.thumbFallback]}>
                    <Text style={styles.thumbEmoji}>{CATEGORY_EMOJI[rec.category] ?? '✨'}</Text>
                  </View>
                )}
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {rec.title}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {ownerName ? `reckied by ${ownerName}` : rec.city ?? rec.category}
                  </Text>
                </View>
                <PressableScale
                  style={[styles.triedBtn, tried && styles.triedBtnOn]}
                  haptic="none"
                  onPress={() => toggleTried(rec)}>
                  {tried ? (
                    <SymbolView name="checkmark" size={12} tintColor={Colors.marigoldDeep} weight="semibold" />
                  ) : null}
                  <Text style={[styles.triedText, tried && styles.triedTextOn]}>
                    {tried ? 'Tried' : 'Tried it?'}
                  </Text>
                </PressableScale>
              </PressableScale>
            );
          })}
        </View>

        {loaded && visible.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing saved{filter === 'all' ? ' yet' : ' here'}</Text>
            <Text style={styles.emptyHint}>
              Save reckies from your circle and they become your to-do list.
            </Text>
          </View>
        )}
      </ScrollView>
      <BlurHeader title="Saved" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  filters: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.lineSoft,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: Radii.md - 2,
    backgroundColor: Colors.paper,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
  },
  thumbEmoji: {
    fontSize: 20,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontFamily: Fonts.sansMedium,
    fontSize: 15,
    color: Colors.ink,
  },
  rowMeta: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.ink3,
  },
  triedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    borderRadius: Radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: Colors.white,
  },
  triedBtnOn: {
    backgroundColor: Colors.marigoldSoft,
    borderColor: Colors.marigoldSoft,
  },
  triedText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: Colors.ink2,
  },
  triedTextOn: {
    color: Colors.marigoldDeep,
  },
  empty: {
    paddingVertical: 56,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 19,
    color: Colors.ink,
  },
  emptyHint: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.ink2,
    textAlign: 'center',
  },
});
