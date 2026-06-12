import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { CategoryTints, Colors, Fonts, Radii } from '@/constants/theme';
import { catalogueTileWidth, type CityGroup } from '@/lib/categories';
import { getRecImageUrl } from '@/lib/types';

type Props = {
  group: CityGroup;
  width?: number;
  onPress?: () => void;
};

const CATEGORY_LABELS: Record<string, string> = { eat: 'Eat', drink: 'Drink', do: 'Do' };

/** Places row tile: 4:3 landscape, count chip, Fraunces city name. */
export function CityTile({ group, width, onPress }: Props) {
  const tileWidth = width ?? catalogueTileWidth('place');
  const cover = group.recs.map(getRecImageUrl).find(Boolean) ?? null;
  const count = group.recs.length;
  const categories = [...new Set(group.recs.map((rec) => CATEGORY_LABELS[rec.category]).filter(Boolean))];

  return (
    <PressableScale style={{ width: tileWidth }} onPress={onPress} haptic="light">
      <View style={[styles.media, { width: tileWidth, aspectRatio: 4 / 3 }]}>
        {cover ? (
          <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={180} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: CategoryTints.eat, opacity: 0.35 }]} />
        )}
        <View style={styles.countChip}>
          <Text style={styles.countText}>{count} spots</Text>
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
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: Colors.paper,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
  },
  countChip: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: Radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  countText: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: Colors.ink,
  },
  city: {
    marginTop: 8,
    fontFamily: Fonts.display,
    fontSize: 15,
    color: Colors.ink,
  },
  caption: {
    marginTop: 1,
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: Colors.ink3,
  },
});
