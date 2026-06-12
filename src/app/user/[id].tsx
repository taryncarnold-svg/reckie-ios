import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { BlurHeader, useHeaderHeight } from '@/components/blur-header';
import { CategorizedShelves } from '@/components/categorized-shelves';
import { PressableScale } from '@/components/pressable-scale';
import { useReckieDetail } from '@/components/reckie-detail-sheet';
import { Colors, Fonts, Radii } from '@/constants/theme';
import { TopEight } from '@/components/top-eight';
import { useAuth } from '@/lib/auth';
import { fetchCosignsReceivedCount, fetchTopLists, fetchUserProfile, setFollowing } from '@/lib/data';
import { notifyDataChanged } from '@/lib/refresh';
import { supabase } from '@/lib/supabase';
import type { Profile, Rec, TopListWithRecs } from '@/lib/types';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { openReckie } = useReckieDetail();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [cosignsEarned, setCosignsEarned] = useState(0);
  const [topLists, setTopLists] = useState<TopListWithRecs[]>([]);
  const [following, setFollowingState] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const userId = session?.user.id;

  const load = useCallback(async () => {
    if (!id || !userId) return;
    const [{ profile: nextProfile, recs: nextRecs }, { data: followRow }, cosignCount, lists] =
      await Promise.all([
        fetchUserProfile(id),
        supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId)
          .eq('following_id', id)
          .maybeSingle(),
        fetchCosignsReceivedCount(id),
        fetchTopLists(id),
      ]);
    setProfile(nextProfile);
    setRecs(nextRecs);
    setFollowingState(!!followRow);
    setCosignsEarned(cosignCount);
    setTopLists(lists);
    setLoaded(true);
  }, [id, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFollow = async () => {
    if (!userId || !id || busy) return;
    setBusy(true);
    const next = !following;
    setFollowingState(next);
    try {
      await setFollowing(userId, id, next);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notifyDataChanged();
    } catch {
      setFollowingState(!next);
    } finally {
      setBusy(false);
    }
  };

  const displayName = profile?.name ?? profile?.handle ?? 'Profile';

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + 20,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.profileRow}>
          <View style={styles.profileText}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            {profile?.handle ? <Text style={styles.handle}>@{profile.handle}</Text> : null}
            {profile?.bio ? (
              <Text style={styles.bio} numberOfLines={2}>
                {profile.bio}
              </Text>
            ) : null}
          </View>
          <Avatar profile={profile} size={64} />
        </View>

        <View style={styles.heroRow}>
          <View style={styles.heroBlock}>
            <Text style={styles.heroNumber}>{cosignsEarned}</Text>
            <Text style={styles.heroLabel}>co-signs earned</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroBlock}>
            <Text style={styles.heroNumberInk}>{recs.length}</Text>
            <Text style={styles.heroLabel}>{recs.length === 1 ? 'reckie' : 'reckies'}</Text>
          </View>
        </View>

        <PressableScale
          style={[styles.followBtn, following && styles.followingBtn]}
          haptic="medium"
          onPress={toggleFollow}
          disabled={busy || !loaded}>
          <Text style={[styles.followText, following && styles.followingText]}>
            {following ? 'Following' : 'Follow'}
          </Text>
        </PressableScale>

        {topLists.length > 0 && (
          <View style={styles.topEights}>
            {topLists.map((entry) => (
              <TopEight
                key={entry.list.id}
                entry={entry}
                onPressRec={(rec) => openReckie({ rec, onChanged: load })}
              />
            ))}
          </View>
        )}

        <CategorizedShelves
          recs={recs}
          emptyMessage={loaded ? 'No reckies yet' : 'Loading…'}
          emptyHint={loaded ? `${displayName} hasn’t added anything yet.` : undefined}
          onPressRec={(rec) => openReckie({ rec, onChanged: load })}
          onPressCity={(group) =>
            router.push({
              pathname: '/city',
              params: { userId: id, city: group.city, ownerName: displayName },
            })
          }
        />
      </ScrollView>
      <BlurHeader title={displayName} />
      <PressableScale
        style={[styles.backBtn, { top: insets.top + 7 }]}
        haptic="selection"
        onPress={() => router.back()}>
        <SymbolView name="chevron.left" size={17} tintColor={Colors.foreground} weight="semibold" />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  profileText: {
    flex: 1,
  },
  name: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.ink,
  },
  handle: {
    marginTop: 2,
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    color: Colors.ink3,
  },
  bio: {
    marginTop: 6,
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.ink2,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.line,
    marginBottom: 18,
  },
  heroBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 7,
  },
  heroDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: Colors.line,
  },
  heroNumber: {
    fontFamily: Fonts.display,
    fontSize: 30,
    color: Colors.oxblood,
  },
  heroNumberInk: {
    fontFamily: Fonts.display,
    fontSize: 30,
    color: Colors.ink,
  },
  heroLabel: {
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    color: Colors.ink2,
  },
  followBtn: {
    backgroundColor: Colors.ink,
    borderRadius: Radii.button,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 28,
  },
  followingBtn: {
    backgroundColor: Colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
  },
  followText: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 15,
    color: '#fff',
  },
  followingText: {
    color: Colors.ink2,
  },
  topEights: {
    gap: 14,
    marginBottom: 26,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
