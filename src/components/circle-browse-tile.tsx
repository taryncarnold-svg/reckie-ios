import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { Colors, Fonts } from '@/constants/theme';
import { aspectRatioForCategory, CATEGORY_EMOJI } from '@/lib/categories';
import { formatReckonerNames } from '@/lib/data';
import { getRecImageUrl, type Profile, type Rec } from '@/lib/types';

const TILE_WIDTH = 132;

type Props = {
  rec: Rec;
  reckoners: Profile[];
  vouchCount: number;
  onPress: (rec: Rec) => void;
};

/** Larger browse tile for Circle (not a cramped list row). */
export function CircleBrowseTile({ rec, reckoners, vouchCount, onPress }: Props) {
  const imageUrl = getRecImageUrl(rec);
  const ratio = aspectRatioForCategory(rec.category);
  const who = formatReckonerNames(reckoners, 2);

  return (
    <PressableScale style={styles.tile} haptic="light" onPress={() => onPress(rec)}>
      <View style={[styles.media, { aspectRatio: ratio }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={180} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.fallback]}>
            <Text style={styles.emoji}>{CATEGORY_EMOJI[rec.category] ?? '✨'}</Text>
          </View>
        )}
        {vouchCount >= 2 ? (
          <View style={styles.vouchChip}>
            <Text style={styles.vouchText}>{vouchCount} vouches</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {rec.title}
      </Text>
      {who ? (
        <Text style={styles.who} numberOfLines={1}>
          {who}
        </Text>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: TILE_WIDTH,
  },
  media: {
    width: TILE_WIDTH,
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: Colors.lineSoft,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.lineSoft,
  },
  emoji: {
    fontSize: 28,
  },
  vouchChip: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.oxbloodSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  vouchText: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 10,
    color: Colors.oxblood,
  },
  title: {
    marginTop: 8,
    fontFamily: Fonts.displayMedium,
    fontSize: 14,
    lineHeight: 16,
    color: Colors.ink,
  },
  who: {
    marginTop: 2,
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: Colors.ink3,
  },
});

export const CIRCLE_BROWSE_TILE_WIDTH = TILE_WIDTH;
