import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { CategoryTints, Colors, Fonts, Radii } from '@/constants/theme';
import type { CityGroup } from '@/lib/categories';
import { getRecImageUrl } from '@/lib/types';

type Props = {
  group: CityGroup;
  width: number;
  onPress?: () => void;
};

const CATEGORY_LABELS: Record<string, string> = { eat: 'Eat', drink: 'Drink', do: 'Do' };

/**
 * City card (DESIGN.md §5): photo-forward — image top with a small white count
 * chip (Fraunces); below, city name in Fraunces + thin caption of categories.
 */
export function CityTile({ group, width, onPress }: Props) {
  const cover = group.recs.map(getRecImageUrl).find(Boolean) ?? null;
  const count = group.recs.length;
  const categories = [...new Set(group.recs.map((rec) => CATEGORY_LABELS[rec.category]).filter(Boolean))];

  return (
    <PressableScale style={{ width }} onPress={onPress} haptic="light">
      <View style={[styles.media, { width, height: width * 0.66 }]}>
        {cover ? (
          <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={180} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: CategoryTints.eat, opacity: 0.25 }]} />
        )}
        <View style={styles.countChip}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      </View>
      <Text style={styles.city} numberOfLines={1}>
        {group.city}
      </Text>
      <Text style={styles.caption} numberOfLines={1}>
        {categories.join(' · ')}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  media: {
    borderRadius: Radii.lg,
    overflow: 'hidden',
    backgroundColor: Colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
  },
  countChip: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  countText: {
    fontFamily: Fonts.display,
    fontSize: 12.5,
    color: Colors.ink,
  },
  city: {
    marginTop: 8,
    fontFamily: Fonts.display,
    fontSize: 17,
    color: Colors.ink,
  },
  caption: {
    marginTop: 1,
    fontFamily: Fonts.sans,
    fontSize: 11.5,
    color: Colors.ink3,
  },
});
