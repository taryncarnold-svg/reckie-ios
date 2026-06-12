import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { BlurHeader, useHeaderHeight } from '@/components/blur-header';
import { PeopleCard } from '@/components/people-card';
import { PressableScale } from '@/components/pressable-scale';
import { useReckieDetail } from '@/components/reckie-detail-sheet';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { Colors, Fonts, Radii } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { CATEGORY_EMOJI } from '@/lib/categories';
import {
  fetchFollowingActivity,
  fetchPeopleDirectory,
  filterPeople,
  type ActivityItem,
  type PeopleMember,
} from '@/lib/data';
import { useDataChanged } from '@/lib/refresh';
import { getRecImageUrl } from '@/lib/types';

type SubTab = 'activity' | 'people';

export default function CircleScreen() {
  const { session } = useAuth();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { openReckie } = useReckieDetail();

  const [subTab, setSubTab] = useState<SubTab>('activity');
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [people, setPeople] = useState<PeopleMember[]>([]);
  const [peopleQuery, setPeopleQuery] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const userId = session?.user.id;

  const load = useCallback(async () => {
    if (!userId) return;
    const [feed, directory] = await Promise.all([
      fetchFollowingActivity(userId),
      fetchPeopleDirectory(userId),
    ]);
    setActivity(feed);
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

  const visiblePeople = filterPeople(people, peopleQuery);
  const followingCount = people.filter((member) => member.is_following).length;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + 20,
          paddingBottom: tabBarHeight + 32,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} progressViewOffset={headerHeight} />
        }>
        <Text style={styles.heading}>Circle</Text>
        <Text style={styles.subtitle}>
          {followingCount > 0
            ? `Following ${followingCount} ${followingCount === 1 ? 'person' : 'people'}`
            : 'Follow people to fill your feed'}
        </Text>

        <View style={styles.tabs}>
          <SegmentedTabs
            options={[
              { id: 'activity', label: 'Activity' },
              { id: 'people', label: 'People' },
            ]}
            value={subTab}
            onChange={setSubTab}
          />
        </View>

        {subTab === 'activity' ? (
          activity.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{loaded ? 'Nothing here yet' : 'Loading…'}</Text>
              {loaded && (
                <Text style={styles.emptyHint}>
                  Follow people in the People tab and their reckies will show up here.
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.feed}>
              {activity.map((item) => {
                const imageUrl = getRecImageUrl(item.rec);
                const reckiedBy = item.profile.name ?? item.profile.handle ?? 'Someone';
                return (
                  <PressableScale
                    key={item.rec.id}
                    style={styles.activityCard}
                    haptic="light"
                    onPress={() => openReckie({ rec: item.rec, onChanged: load })}>
                    <View style={styles.activityThumb}>
                      {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                      ) : (
                        <View style={styles.activityThumbFallback}>
                          <Text style={styles.activityEmoji}>{CATEGORY_EMOJI[item.rec.category]}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.activityText}>
                      <Text style={styles.activityTitle} numberOfLines={1}>
                        {item.rec.title}
                      </Text>
                      {item.rec.note ? (
                        <Text style={styles.activityNote} numberOfLines={2}>
                          “{item.rec.note.trim()}”
                        </Text>
                      ) : null}
                      <View style={styles.activityByline}>
                        <Avatar profile={item.profile} size={16} />
                        <Text style={styles.activityBy} numberOfLines={1}>
                          Reckied by {reckiedBy}
                        </Text>
                      </View>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          )
        ) : (
          <View style={styles.peopleList}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search people by name or @handle"
              placeholderTextColor={Colors.muted}
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
  heading: {
    fontFamily: Fonts.displayMedium,
    fontSize: 28,
    color: Colors.ink,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    color: Colors.ink2,
  },
  tabs: {
    marginTop: 16,
    marginBottom: 20,
  },
  feed: {
    gap: 12,
  },
  activityCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line2,
    borderRadius: Radii.lg,
    padding: 12,
  },
  activityThumb: {
    width: 64,
    height: 64,
    borderRadius: Radii.md,
    overflow: 'hidden',
    backgroundColor: Colors.lineSoft,
  },
  activityThumbFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityEmoji: {
    fontSize: 22,
  },
  activityText: {
    flex: 1,
    gap: 3,
  },
  activityTitle: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 15.5,
    color: Colors.ink,
  },
  // Notes stay Inter — human voice without serif pull-quote styling.
  activityNote: {
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.noteText,
  },
  activityByline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  activityBy: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.ink3,
  },
  peopleList: {
    gap: 4,
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
    paddingHorizontal: 24,
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
