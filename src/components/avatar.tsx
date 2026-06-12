import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import type { Profile } from '@/lib/types';

export function Avatar({ profile, size = 56 }: { profile: Profile | null; size?: number }) {
  const initials = (profile?.name ?? profile?.handle ?? '?')
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const radius = size / 2;

  if (profile?.avatar_url) {
    return (
      <Image
        source={{ uri: profile.avatar_url }}
        style={{ width: size, height: size, borderRadius: radius }}
        contentFit="cover"
        transition={150}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: profile?.avatar_color ?? Colors.oxblood,
        },
      ]}>
      <Text style={[styles.initials, { fontSize: Math.max(size * 0.36, 9) }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#fff',
    fontFamily: Fonts.display,
  },
});
