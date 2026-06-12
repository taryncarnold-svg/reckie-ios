import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { CategoryTints, Colors, Fonts, Radii } from '@/constants/theme';
import { isPortraitCategory } from '@/lib/categories';
import { getRecImageUrl, type Rec } from '@/lib/types';

type Props = {
  rec: Rec;
  width: number;
  /** "Reckied by [name]" caption, for saved/circle contexts. */
  reckiedBy?: string | null;
  onPress?: () => void;
};

/**
 * Poster tile (DESIGN.md §5): Letterboxd-style. Portrait = 2:3 image, subtle
 * bottom gradient, small bold sans title over it. Square = image + title below.
 */
export function ReckieCard({ rec, width, reckiedBy, onPress }: Props) {
  const portrait = isPortraitCategory(rec.category);
  const height = portrait ? width * (3 / 2) : width;
  const imageUrl = getRecImageUrl(rec);
  const tint = CategoryTints[rec.category];

  return (
    <PressableScale style={{ width }} onPress={onPress} haptic="light">
      <View style={[styles.media, { width, height }]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={180}
            recyclingKey={rec.id}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: tint, opacity: 0.3 }]} />
        )}
        {portrait && (
          <>
            <LinearGradient
              colors={['transparent', 'rgba(20,17,14,0.72)']}
              style={styles.gradient}
            />
            <Text style={styles.overlayTitle} numberOfLines={2}>
              {rec.title}
            </Text>
          </>
        )}
      </View>
      {!portrait && (
        <Text style={styles.belowTitle} numberOfLines={2}>
          {rec.title}
        </Text>
      )}
      {reckiedBy ? (
        <Text style={styles.caption} numberOfLines={1}>
          {reckiedBy}
        </Text>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  media: {
    borderRadius: Radii.md,
    overflow: 'hidden',
    backgroundColor: Colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '46%',
  },
  overlayTitle: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    fontFamily: Fonts.sansSemiBold,
    fontSize: 12,
    lineHeight: 15,
    color: '#fff',
  },
  belowTitle: {
    marginTop: 7,
    fontFamily: Fonts.sansMedium,
    fontSize: 12.5,
    lineHeight: 16,
    color: Colors.ink,
  },
  caption: {
    marginTop: 2,
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: Colors.ink3,
  },
});
