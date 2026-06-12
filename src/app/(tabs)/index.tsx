import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { BlurHeader, useHeaderHeight } from '@/components/blur-header';
import { CategorizedShelves } from '@/components/categorized-shelves';
import { PressableScale } from '@/components/pressable-scale';
import { useReckieDetail } from '@/components/reckie-detail-sheet';
import { SectionHeading } from '@/components/section-heading';
import { TopEight } from '@/components/top-eight';
import { TopEightEditor, type TopEightEditorRef } from '@/components/top-eight-editor';
import { Colors, Fonts, Radii } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import {
  fetchCosignsReceivedCount,
  fetchPulse,
  fetchTopLists,
  type CosignStamp,
  type PulseItem,
} from '@/lib/data';
import { useDataChanged } from '@/lib/refresh';
import { supabase } from '@/lib/supabase';
import { getRecImageUrl, type Profile, type Rec, type TopListWithRecs } from '@/lib/types';

/**
 * Home (PRODUCT.md §5): pulse + catalogue hybrid. A capped, calm pulse up top
 * (reckies + co-signs only, never infinite), your catalogue below.
 */
export default function HomeScreen() {
  const { session } = useAuth();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { openReckie } = useReckieDetail();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [myRecs, setMyRecs] = useState<Rec[]>([]);
  const [cosignsEarned, setCosignsEarned] = useState(0);
  const [pulse, setPulse] = useState<PulseItem[]>([]);
  const [stamp, setStamp] = useState<CosignStamp | null>(null);
  const [topLists, setTopLists] = useState<TopListWithRecs[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const editorRef = useRef<TopEightEditorRef>(null);

  const userId = session?.user.id;

  const load = useCallback(async () => {
    if (!userId) return;
    const [profileRes, recsRes, pulseRes, cosignCount, lists] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('recs').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      fetchPulse(userId),
      fetchCosignsReceivedCount(userId),
      fetchTopLists(userId),
    ]);

    if (profileRes.data) setProfile(profileRes.data as Profile);
    if (recsRes.data) setMyRecs(recsRes.data as Rec[]);
    setPulse(pulseRes.items);
    setStamp(pulseRes.stamp);
    setCosignsEarned(cosignCount);
    setTopLists(lists);
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

  const displayName = profile?.name ?? session?.user.email ?? 'You';

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + 20,
          paddingBottom: tabBarHeight + 32,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} progressViewOffset={headerHeight} />
        }>
        {/* ——— The pulse ——— */}
        {pulse.length > 0 && (
          <View style={styles.pulseSection}>
            <SectionHeading title="The pulse" />
            <View style={styles.pulseCard}>
              {pulse.map((item, index) => (
                <PulseRow
                  key={item.id}
                  item={item}
                  last={index === pulse.length - 1}
                  onPress={() => openReckie({ rec: item.rec, onChanged: load })}
                />
              ))}
            </View>
          </View>
        )}

        {/* ——— Co-sign stamp: the one flourish ——— */}
        {stamp && (
          <PressableScale
            style={styles.stamp}
            haptic="light"
            onPress={() => openReckie({ rec: stamp.rec, onChanged: load })}>
            <View style={styles.stampFaces}>
              {stamp.profiles.slice(0, 3).map((p, i) => (
                <View key={p.id} style={[styles.stampFace, i > 0 && { marginLeft: -8 }]}>
                  <Avatar profile={p} size={26} />
                </View>
              ))}
            </View>
            <Text style={styles.stampText} numberOfLines={2}>
              <Text style={styles.stampCount}>{stamp.profiles.length} in your circle</Text> reckied{' '}
              {stamp.title}
            </Text>
          </PressableScale>
        )}

        {/* ——— Profile header ——— */}
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

        {/* ——— Hero number: co-signs earned ——— */}
        <View style={styles.heroRow}>
          <View style={styles.heroBlock}>
            <Text style={styles.heroNumber}>{cosignsEarned}</Text>
            <Text style={styles.heroLabel}>co-signs earned</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroBlock}>
            <Text style={styles.heroNumberSmall}>{myRecs.length}</Text>
            <Text style={styles.heroLabel}>{myRecs.length === 1 ? 'reckie' : 'reckies'}</Text>
          </View>
        </View>

        {/* ——— Top 8: leads the profile (PRODUCT.md §5) ——— */}
        {topLists.length > 0 ? (
          <View style={styles.topEights}>
            {topLists.map((entry) => (
              <TopEight
                key={entry.list.id}
                entry={entry}
                onPressRec={(rec) => openReckie({ rec, onChanged: load })}
                onEdit={() => editorRef.current?.present(myRecs, topLists)}
              />
            ))}
          </View>
        ) : myRecs.length >= 3 ? (
          <PressableScale
            style={styles.topEightInvite}
            haptic="light"
            onPress={() => editorRef.current?.present(myRecs, topLists)}>
            <View style={styles.inviteText}>
              <Text style={styles.inviteTitle}>Rank your Top 8</Text>
              <Text style={styles.inviteHint}>Your most shareable artifact. Takes a minute.</Text>
            </View>
            <Text style={styles.inviteChevron}>›</Text>
          </PressableScale>
        ) : null}

        {/* ——— Catalogue ——— */}
        <CategorizedShelves
          recs={myRecs}
          emptyMessage="No reckies yet"
          emptyHint="Tap + and put your name on something good."
          onPressRec={(rec) => openReckie({ rec, onChanged: load })}
          onPressCity={(group) =>
            router.push({ pathname: '/city', params: { userId: userId!, city: group.city } })
          }
        />

        <PressableScale style={styles.signOut} haptic="selection" onPress={() => supabase.auth.signOut()}>
          <Text style={styles.signOutText}>Sign out</Text>
        </PressableScale>
      </ScrollView>
      <BlurHeader wordmark />
      <TopEightEditor ref={editorRef} />
    </View>
  );
}

function PulseRow({ item, last, onPress }: { item: PulseItem; last: boolean; onPress: () => void }) {
  const imageUrl = getRecImageUrl(item.rec);
  const who = item.profile.name ?? item.profile.handle ?? 'Someone';
  const payoff = item.kind === 'cosign_payoff';

  return (
    <PressableScale style={[styles.pulseRow, !last && styles.pulseRowBorder]} haptic="light" onPress={onPress}>
      <Avatar profile={item.profile} size={36} />
      <View style={styles.pulseBody}>
        <Text style={styles.pulseText} numberOfLines={2}>
          <Text style={styles.pulseWho}>{who}</Text>
          {payoff ? ' co-signed your ' : ' reckied '}
          <Text style={styles.pulseTitle}>{item.rec.title}</Text>
        </Text>
        {payoff && <Text style={styles.payoffMark}>✺ your taste, traveling</Text>}
      </View>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.pulseThumb} contentFit="cover" transition={150} />
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  pulseSection: {
    marginBottom: 18,
  },
  pulseCard: {
    backgroundColor: Colors.paper,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    paddingHorizontal: 14,
  },
  pulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
  },
  pulseRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.line,
  },
  pulseBody: {
    flex: 1,
    gap: 2,
  },
  pulseText: {
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.ink2,
  },
  pulseWho: {
    fontFamily: Fonts.sansSemiBold,
    color: Colors.ink,
  },
  pulseTitle: {
    fontFamily: Fonts.sansMedium,
    color: Colors.ink,
  },
  payoffMark: {
    fontFamily: Fonts.sansMedium,
    fontSize: 11.5,
    color: Colors.marigoldDeep,
  },
  pulseThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.lineSoft,
  },
  stamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: Colors.marigoldSoft,
    borderRadius: Radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 24,
  },
  stampFaces: {
    flexDirection: 'row',
  },
  stampFace: {
    borderWidth: 2,
    borderColor: Colors.marigoldSoft,
    borderRadius: 15,
  },
  stampText: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.ink,
  },
  stampCount: {
    fontFamily: Fonts.sansSemiBold,
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
    marginBottom: 26,
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
  heroNumberSmall: {
    fontFamily: Fonts.display,
    fontSize: 30,
    color: Colors.ink,
  },
  heroLabel: {
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    color: Colors.ink2,
  },
  topEights: {
    gap: 14,
    marginBottom: 26,
  },
  topEightInvite: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    borderRadius: Radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 26,
  },
  inviteText: {
    flex: 1,
    gap: 2,
  },
  inviteTitle: {
    fontFamily: Fonts.display,
    fontSize: 17,
    color: Colors.ink,
  },
  inviteHint: {
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    color: Colors.ink2,
  },
  inviteChevron: {
    fontSize: 22,
    color: Colors.ink3,
  },
  signOut: {
    alignSelf: 'center',
    marginTop: 40,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  signOutText: {
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    color: Colors.ink3,
  },
});
