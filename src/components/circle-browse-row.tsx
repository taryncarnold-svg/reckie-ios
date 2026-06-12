import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { PressableScale } from '@/components/pressable-scale';
import { Colors, Fonts, Radii } from '@/constants/theme';
import { CATEGORY_EMOJI, isLocationCategory, browseFilterLabel } from '@/lib/categories';
import { formatReckonerNames, type CircleBrowseItem } from '@/lib/data';
import { getRecImageUrl, type Rec } from '@/lib/types';

type Props = {
  item: CircleBrowseItem;
  showCategory?: boolean;
  onPress: (rec: Rec) => void;
};

export function CircleBrowseRow({ item, showCategory, onPress }: Props) {
  const { rec, reckoners, vouchCount } = item;
  const imageUrl = getRecImageUrl(rec);
  const portrait = rec.category === 'watch' || rec.category === 'read';
  const thumbW = portrait ? 42 : 48;
  const thumbH = portrait ? 60 : 48;
  const whoLine = formatReckonerNames(reckoners, 2);
  const categoryHint =
    showCategory && rec.category
      ? isLocationCategory(rec.category)
        ? 'Places'
        : browseFilterLabel(
            rec.category === 'watch' ||
              rec.category === 'listen' ||
              rec.category === 'read' ||
              rec.category === 'play'
              ? rec.category
              : 'all'
          )
      : null;

  return (
    <PressableScale style={styles.row} haptic="light" onPress={() => onPress(rec)}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={[styles.thumb, { width: thumbW, height: thumbH }]} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback, { width: thumbW, height: thumbH }]}>
          <Text style={styles.emoji}>{CATEGORY_EMOJI[rec.category] ?? '✨'}</Text>
        </View>
      )}
      <View style={styles.meat}>
        <Text style={styles.title} numberOfLines={2}>
          {rec.title}
        </Text>
        <View style={styles.whoRow}>
          {reckoners.length > 0 && reckoners.length <= 3 ? (
            <View style={styles.miniFaces}>
              {reckoners.slice(0, 3).map((p, i) => (
                <View key={p.id} style={[styles.miniFace, i > 0 && { marginLeft: -5 }]}>
                  <Avatar profile={p} size={18} />
                </View>
              ))}
            </View>
          ) : null}
          <Text style={styles.who} numberOfLines={1}>
            {whoLine}
            {categoryHint ? ` · ${categoryHint}` : ''}
          </Text>
        </View>
      </View>
      {vouchCount >= 2 ? (
        <View style={styles.vouchChip}>
          <Text style={styles.vouchText}>
            {vouchCount} {vouchCount === 1 ? 'vouch' : 'vouches'}
          </Text>
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.line2,
  },
  thumb: {
    borderRadius: 9,
    backgroundColor: Colors.lineSoft,
    flexShrink: 0,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 20,
  },
  meat: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: Fonts.displayMedium,
    fontSize: 16,
    lineHeight: 17.5,
    color: Colors.ink,
  },
  whoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniFaces: {
    flexDirection: 'row',
  },
  miniFace: {
    borderWidth: 1.5,
    borderColor: Colors.paper,
    borderRadius: 9,
  },
  who: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.ink3,
  },
  vouchChip: {
    flexShrink: 0,
    backgroundColor: Colors.oxbloodSoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  vouchText: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 11,
    color: Colors.oxblood,
  },
});
