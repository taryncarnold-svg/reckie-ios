import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { CircleBrowseRow } from '@/components/circle-browse-row';
import { CircleClassicHero } from '@/components/circle-classic-hero';
import { BlurHeader, useHeaderHeight } from '@/components/blur-header';
import { PeopleCard } from '@/components/people-card';
import { PressableScale } from '@/components/pressable-scale';
import { useReckieDetail } from '@/components/reckie-detail-sheet';
import { Colors, Fonts, Radii } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import {
  CIRCLE_BROWSE_FILTERS,
  recMatchesBrowseFilter,
  type CircleBrowseFilter,
} from '@/lib/categories';
import {
  CLASSIC_MIN_VOUCHES,
  fetchCircleBrowse,
  fetchPeopleDirectory,
  filterPeople,
  type CircleBrowseItem,
  type PeopleMember,
} from '@/lib/data';
import { useDataChanged } from '@/lib/refresh';

type Lens = 'browse' | 'people';

export default function CircleScreen() {
  const { session } = useAuth();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { openReckie } = useReckieDetail();

  const [lens, setLens] = useState<Lens>('browse');
  const [browseFilter, setBrowseFilter] = useState<CircleBrowseFilter>('all');
  const [browseItems, setBrowseItems] = useState<CircleBrowseItem[]>([]);
  const [people, setPeople] = useState<PeopleMember[]>([]);
  const [peopleQuery, setPeopleQuery] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const userId = session?.user.id;

  const load = useCallback(async () => {
    if (!userId) return;
    const [items, directory] = await Promise.all([fetchCircleBrowse(userId), fetchPeopleDirectory(userId)]);
    setBrowseItems(items);
    setPeople(directory);
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

  const followingCount = people.filter((m) => m.is_following).length;
  const visiblePeople = filterPeople(people, peopleQuery);

  const filteredBrowse = useMemo(
    () => browseItems.filter((item) => recMatchesBrowseFilter(item.rec, browseFilter)),
    [browseItems, browseFilter]
  );

  const classics = filteredBrowse.filter((item) => item.vouchCount >= CLASSIC_MIN_VOUCHES);
  const rest = filteredBrowse.filter((item) => item.vouchCount < CLASSIC_MIN_VOUCHES);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + 20,
          paddingBottom: tabBarHeight + 32,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} progressViewOffset={headerHeight} />
        }>
        <View style={styles.headerPad}>
          <Text style={styles.heading}>Circle</Text>
          <Text style={styles.subtitle}>
            {followingCount > 0
              ? `${followingCount} ${followingCount === 1 ? 'person' : 'people'} · what they swear by`
              : 'Follow people to see what they swear by'}
          </Text>

          <View style={styles.lensRow}>
            {(['browse', 'people'] as Lens[]).map((opt) => (
              <PressableScale
                key={opt}
                style={[styles.lensPill, lens === opt && styles.lensPillOn]}
                haptic="selection"
                onPress={() => setLens(opt)}>
                <Text style={[styles.lensText, lens === opt && styles.lensTextOn]}>
                  {opt === 'browse' ? 'Browse' : 'People'}
                </Text>
              </PressableScale>
            ))}
          </View>
        </View>

        {lens === 'browse' ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catRow}
              decelerationRate="fast">
              {CIRCLE_BROWSE_FILTERS.map((cat) => (
                <PressableScale
                  key={cat.id}
                  style={[styles.catPill, browseFilter === cat.id && styles.catPillOn]}
                  haptic="selection"
                  onPress={() => setBrowseFilter(cat.id)}>
                  <Text style={[styles.catText, browseFilter === cat.id && styles.catTextOn]}>
                    {cat.emoji ? `${cat.emoji} ` : ''}
                    {cat.label}
                  </Text>
                </PressableScale>
              ))}
            </ScrollView>

            {!loaded ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Loading…</Text>
              </View>
            ) : filteredBrowse.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Nothing here yet</Text>
                <Text style={styles.emptyHint}>
                  Follow people in the People tab and their reckies will show up here.
                </Text>
              </View>
            ) : (
              <View>
                {classics.length > 0 && (
                  <View style={styles.sectionPad}>
                    <Text style={styles.sectionLabelGold}>★ Circle {classics.length === 1 ? 'classic' : 'classics'}</Text>
                    {classics.map((item) => (
                      <CircleClassicHero
                        key={item.canonicalKey}
                        item={item}
                        onPress={(rec) => openReckie({ rec, onChanged: load })}
                      />
                    ))}
                  </View>
                )}

                {rest.length > 0 && (
                  <View style={styles.sectionPad}>
                    <Text style={styles.sectionLabel}>
                      {classics.length > 0 ? 'Most loved right now' : 'From your circle'}
                    </Text>
                    {rest.map((item) => (
                      <CircleBrowseRow
                        key={item.canonicalKey}
                        item={item}
                        showCategory={browseFilter === 'all'}
                        onPress={(rec) => openReckie({ rec, onChanged: load })}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}
          </>
        ) : (
          <View style={styles.sectionPad}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search people by name or @handle"
              placeholderTextColor={Colors.ink3}
              value={peopleQuery}
              onChangeText={setPeopleQuery}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {visiblePeople.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>{loaded ? 'No one found' : 'Loading…'}</Text>
                {loaded && peopleQuery ? <Text style={styles.emptyHint}>Try a different search.</Text> : null}
              </View>
            ) : (
              visiblePeople.map((member) => (
                <PeopleCard
                  key={member.profile.id}
                  member={member}
                  currentUserId={userId!}
                  onPress={() => router.push(`/user/${member.profile.id}`)}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>
      <BlurHeader title="Circle" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  headerPad: {
    paddingHorizontal: 20,
  },
  heading: {
    fontFamily: Fonts.displayMedium,
    fontSize: 30,
    letterSpacing: -0.6,
    color: Colors.ink,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.ink3,
  },
  lensRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    marginBottom: 4,
  },
  lensPill: {
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: Radii.pill,
    backgroundColor: Colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.buttonBorder,
  },
  lensPillOn: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  lensText: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 13.5,
    color: Colors.ink2,
  },
  lensTextOn: {
    color: '#fff',
  },
  catRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  catPill: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: Radii.pill,
    backgroundColor: '#F1ECE3',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line2,
  },
  catPillOn: {
    backgroundColor: Colors.oxblood,
    borderColor: Colors.oxblood,
  },
  catText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.ink2,
  },
  catTextOn: {
    color: '#fff',
  },
  sectionPad: {
    paddingHorizontal: 20,
  },
  sectionLabelGold: {
    fontFamily: Fonts.sansBold,
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: Colors.marigoldDeep,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionLabel: {
    fontFamily: Fonts.sansBold,
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: Colors.ink3,
    marginBottom: 4,
    marginTop: 8,
  },
  searchInput: {
    backgroundColor: Colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    borderRadius: Radii.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.ink,
    marginBottom: 6,
  },
  empty: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: Fonts.displayMedium,
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
