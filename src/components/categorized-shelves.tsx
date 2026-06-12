import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CityTile } from '@/components/city-tile';
import { ReckieCard } from '@/components/reckie-card';
import { SectionHeading } from '@/components/section-heading';
import { Colors, Fonts } from '@/constants/theme';
import { TOP_SHELVES, groupRecsByCity, type CityGroup } from '@/lib/categories';
import type { Rec } from '@/lib/types';

const H_PAD = 20;
const ROW_GAP = 12;

type Props = {
  recs: Rec[];
  ownerNames?: Record<string, string>;
  /** Shown under tiles when no ownerNames entry (e.g. "you" on Home). */
  selfLabel?: string;
  emptyMessage: string;
  emptyHint?: string;
  onPressRec?: (rec: Rec) => void;
  onPressCity?: (group: CityGroup) => void;
};

/**
 * Catalogue (mockup right): horizontal-scroll rows per category,
 * each tile in its native aspect ratio.
 */
export function CategorizedShelves({
  recs,
  ownerNames,
  selfLabel,
  emptyMessage,
  emptyHint,
  onPressRec,
  onPressCity,
}: Props) {
  if (recs.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{emptyMessage}</Text>
        {emptyHint ? <Text style={styles.emptyHint}>{emptyHint}</Text> : null}
      </View>
    );
  }

  const cityGroups = groupRecsByCity(recs);

  return (
    <View style={styles.container}>
      {cityGroups.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionPad}>
            <SectionHeading title="Places" count={cityGroups.length} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rowContent}
            decelerationRate="fast">
            {cityGroups.map((group) => (
              <CityTile key={group.city.toLowerCase()} group={group} onPress={() => onPressCity?.(group)} />
            ))}
          </ScrollView>
        </View>
      )}

      {TOP_SHELVES.filter((shelf) => shelf.id !== 'go').map((shelf) => {
        const shelfRecs = recs.filter((rec) => shelf.categories.includes(rec.category));
        if (shelfRecs.length === 0) return null;
        return (
          <View key={shelf.id} style={styles.section}>
            <View style={styles.sectionPad}>
              <SectionHeading title={shelf.label} count={shelfRecs.length} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rowContent}
              decelerationRate="fast">
              {shelfRecs.map((rec) => (
                <ReckieCard
                  key={rec.id}
                  rec={rec}
                  reckiedBy={ownerNames?.[rec.id] ?? selfLabel}
                  onPress={() => onPressRec?.(rec)}
                />
              ))}
            </ScrollView>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
  },
  section: {
    marginHorizontal: -H_PAD,
  },
  sectionPad: {
    paddingHorizontal: H_PAD,
  },
  rowContent: {
    flexDirection: 'row',
    gap: ROW_GAP,
    paddingHorizontal: H_PAD,
    paddingBottom: 4,
  },
  empty: {
    paddingVertical: 56,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    fontFamily: Fonts.displayMedium,
    fontSize: 19,
    color: Colors.ink,
  },
  emptyHint: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.ink2,
    textAlign: 'center',
  },
});
