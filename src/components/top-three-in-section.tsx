import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { Colors, Fonts } from '@/constants/theme';
import { aspectRatioForCategory, CATEGORY_EMOJI } from '@/lib/categories';
import { getRecImageUrl, type Rec } from '@/lib/types';

type Props = {
  label: string;
  recs: Rec[];
  onPressRec?: (rec: Rec) => void;
  onSeeAll?: () => void;
};

function recMeta(rec: Rec): string | null {
  const m = rec.metadata;
  if (m?.watch_provider) return String(m.watch_provider);
  if (m?.listen_provider) return String(m.listen_provider);
  if (m?.year) return String(m.year);
  if (m?.type === 'series') return 'Show';
  if (m?.type === 'movie') return 'Film';
  if (rec.city) return rec.city;
  return null;
}

/**
 * Compact Top 3 rows inside a category section (mockup Treatment A).
 * Hairline dividers, no filled card.
 */
export function TopThreeInSection({ label, recs, onPressRec, onSeeAll }: Props) {
  const ranked = recs.slice(0, 3);

  return (
    <View style={styles.block}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>★ {label}</Text>
        {onSeeAll ? (
          <PressableScale haptic="selection" onPress={onSeeAll}>
            <Text style={styles.seeAll}>See all ›</Text>
          </PressableScale>
        ) : null}
      </View>

      {ranked.map((rec, index) => {
        const imageUrl = getRecImageUrl(rec);
        const meta = recMeta(rec);
        const thumbW = 38;
        const thumbH = thumbW / aspectRatioForCategory(rec.category);

        return (
          <PressableScale
            key={rec.id}
            style={[styles.row, index === ranked.length - 1 && styles.rowLast]}
            haptic="light"
            onPress={() => onPressRec?.(rec)}>
            <Text style={styles.rank}>{index + 1}</Text>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={[styles.thumb, { width: thumbW, height: thumbH }]}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <View style={[styles.thumb, styles.thumbFallback, { width: thumbW, height: thumbH }]}>
                <Text style={styles.thumbEmoji}>{CATEGORY_EMOJI[rec.category] ?? '✨'}</Text>
              </View>
            )}
            <Text style={styles.title} numberOfLines={2}>
              {rec.title}
            </Text>
            {meta ? (
              <Text style={styles.meta} numberOfLines={1}>
                {meta}
              </Text>
            ) : null}
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    flex: 1,
    fontFamily: Fonts.sansBold,
    fontSize: 10.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.marigoldDeep,
  },
  seeAll: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 12,
    color: Colors.oxblood,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.line2,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rank: {
    width: 16,
    fontFamily: Fonts.displayMedium,
    fontSize: 15,
    color: '#C9A24B',
    textAlign: 'center',
  },
  thumb: {
    borderRadius: 7,
    backgroundColor: Colors.lineSoft,
    flexShrink: 0,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmoji: {
    fontSize: 16,
  },
  title: {
    flex: 1,
    fontFamily: Fonts.displayMedium,
    fontSize: 15,
    lineHeight: 16.5,
    color: Colors.ink,
  },
  meta: {
    maxWidth: 72,
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: Colors.ink3,
    textAlign: 'right',
  },
});
