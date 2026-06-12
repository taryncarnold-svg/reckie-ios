import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { Colors, Fonts, Radii } from '@/constants/theme';
import { CATEGORY_EMOJI } from '@/lib/categories';
import { getRecImageUrl, type Rec, type TopListWithRecs } from '@/lib/types';

type Props = {
  entry: TopListWithRecs;
  onPressRec?: (rec: Rec) => void;
  /** Shown only on your own profile. */
  onEdit?: () => void;
};

/**
 * The Top 8 block (PRODUCT.md §8): the signature shareable artifact.
 * Marigold is its color — the one earned flourish on the profile.
 */
export function TopEight({ entry, onPressRec, onEdit }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>RANKED</Text>
          <Text style={styles.title}>{entry.list.title}</Text>
        </View>
        {onEdit ? (
          <PressableScale style={styles.editBtn} haptic="selection" onPress={onEdit}>
            <Text style={styles.editText}>Edit</Text>
          </PressableScale>
        ) : null}
      </View>

      {entry.recs.map((rec, index) => {
        const imageUrl = getRecImageUrl(rec);
        return (
          <PressableScale
            key={rec.id}
            style={[styles.row, index < entry.recs.length - 1 && styles.rowBorder]}
            haptic="light"
            onPress={() => onPressRec?.(rec)}>
            <Text style={[styles.rank, index === 0 && styles.rankFirst]}>{index + 1}</Text>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.thumb} contentFit="cover" transition={150} />
            ) : (
              <View style={[styles.thumb, styles.thumbFallback]}>
                <Text style={styles.thumbEmoji}>{CATEGORY_EMOJI[rec.category] ?? '✨'}</Text>
              </View>
            )}
            <View style={styles.rowText}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {rec.title}
              </Text>
              {rec.city ? (
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {rec.city}
                </Text>
              ) : null}
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.marigoldSoft,
    borderRadius: Radii.lg,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 10.5,
    letterSpacing: 1.6,
    color: Colors.marigoldDeep,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 19,
    color: Colors.ink,
  },
  editBtn: {
    backgroundColor: Colors.white,
    borderRadius: Radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12.5,
    color: Colors.ink2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(185, 125, 21, 0.18)',
  },
  rank: {
    width: 24,
    fontFamily: Fonts.display,
    fontSize: 19,
    color: Colors.ink2,
    textAlign: 'center',
  },
  rankFirst: {
    color: Colors.marigoldDeep,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 9,
    backgroundColor: Colors.white,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmoji: {
    fontSize: 16,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  rowTitle: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14.5,
    color: Colors.ink,
  },
  rowMeta: {
    fontFamily: Fonts.sans,
    fontSize: 11.5,
    color: Colors.ink3,
  },
});
