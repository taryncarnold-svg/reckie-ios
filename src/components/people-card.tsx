import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { PressableScale } from '@/components/pressable-scale';
import { Colors, Fonts, Radii } from '@/constants/theme';
import { setFollowing, type PeopleMember } from '@/lib/data';
import { notifyDataChanged } from '@/lib/refresh';

type Props = {
  member: PeopleMember;
  currentUserId: string;
  onPress?: () => void;
};

/** Circle list row (PRODUCT.md §5): photo, name, bio, co-sign count. */
export function PeopleCard({ member, currentUserId, onPress }: Props) {
  const [following, setFollowingState] = useState(member.is_following);
  const [busy, setBusy] = useState(false);

  const toggleFollow = async () => {
    if (busy) return;
    setBusy(true);
    const next = !following;
    setFollowingState(next); // optimistic
    try {
      await setFollowing(currentUserId, member.profile.id, next);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notifyDataChanged();
    } catch {
      setFollowingState(!next);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PressableScale style={styles.row} haptic="light" onPress={onPress}>
      <Avatar profile={member.profile} size={48} />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {member.profile.name ?? member.profile.handle ?? 'Someone'}
        </Text>
        {member.profile.bio ? (
          <Text style={styles.bio} numberOfLines={1}>
            {member.profile.bio}
          </Text>
        ) : null}
        <Text style={styles.meta} numberOfLines={1}>
          {member.cosign_count > 0 ? `${member.cosign_count} co-signs · ` : ''}
          {member.rec_count} {member.rec_count === 1 ? 'reckie' : 'reckies'}
        </Text>
      </View>
      <PressableScale
        style={[styles.followBtn, following && styles.followingBtn]}
        haptic="none"
        onPress={toggleFollow}
        disabled={busy}>
        <Text style={[styles.followText, following && styles.followingText]}>
          {following ? 'Following' : 'Follow'}
        </Text>
      </PressableScale>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.lineSoft,
  },
  text: {
    flex: 1,
    gap: 1,
  },
  name: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.ink,
  },
  bio: {
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    color: Colors.ink2,
  },
  meta: {
    fontFamily: Fonts.sans,
    fontSize: 11.5,
    color: Colors.ink3,
  },
  followBtn: {
    backgroundColor: Colors.ink,
    borderRadius: Radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  followingBtn: {
    backgroundColor: Colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
  },
  followText: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 12.5,
    color: '#fff',
  },
  followingText: {
    color: Colors.ink2,
  },
});
