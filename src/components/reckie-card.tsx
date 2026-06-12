import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { CategoryTints, Colors, Fonts, Radii } from '@/constants/theme';
import { aspectRatioForCategory, catalogueTileWidth, isLocationCategory } from '@/lib/categories';
import { getRecImageUrl, type Rec } from '@/lib/types';

type Props = {
  rec: Rec;
  /** Override width; defaults from category (mockup sizes). */
  width?: number;
  reckiedBy?: string | null;
  onPress?: () => void;
};

/**
 * Catalogue tile (mockup grid): native aspect ratio, title below art,
 * attributor in --ink-3. Places use Fraunces on the title.
 */
export function ReckieCard({ rec, width, reckiedBy, onPress }: Props) {
  const tileWidth = width ?? catalogueTileWidth(rec.category);
  const ratio = aspectRatioForCategory(rec.category);
  const imageUrl = getRecImageUrl(rec);
  const tint = CategoryTints[rec.category];
  const place = isLocationCategory(rec.category);

  return (
    <PressableScale style={{ width: tileWidth }} onPress={onPress} haptic="light">
      <View style={[styles.media, { width: tileWidth, aspectRatio: ratio }]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={180}
            recyclingKey={rec.id}
          />
        ) : (
          <LinearGradient colors={[tint, '#36493D']} style={StyleSheet.absoluteFill} />
        )}
      </View>
      <Text style={[styles.title, place && styles.titlePlace]} numberOfLines={2}>
        {rec.title}
      </Text>
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
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: Colors.paper,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
  },
  title: {
    marginTop: 8,
    fontFamily: Fonts.sansSemiBold,
    fontSize: 12.5,
    lineHeight: 15,
    color: Colors.ink,
  },
  titlePlace: {
    fontFamily: Fonts.display,
    fontSize: 15,
    lineHeight: 18,
  },
  caption: {
    marginTop: 1,
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: Colors.ink3,
  },
});
