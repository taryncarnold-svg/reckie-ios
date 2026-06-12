import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { CityTile } from '@/components/city-tile';
import { ReckieCard } from '@/components/reckie-card';
import { SectionHeading } from '@/components/section-heading';
import { Colors, Fonts } from '@/constants/theme';
import { TOP_SHELVES, groupRecsByCity, type CityGroup } from '@/lib/categories';
import type { Rec } from '@/lib/types';

const SCREEN_PADDING = 20;
const GAP = 12;

type Props = {
  recs: Rec[];
  /** Map of rec id → owner display name, for attribution captions. */
  ownerNames?: Record<string, string>;
  emptyMessage: string;
  emptyHint?: string;
  onPressRec?: (rec: Rec) => void;
  onPressCity?: (group: CityGroup) => void;
};

/**
 * The catalogue (DESIGN.md §5): Places as 2-up city cards, then global
 * categories as 3-up poster/cover grids.
 */
export function CategorizedShelves({ recs, ownerNames, emptyMessage, emptyHint, onPressRec, onPressCity }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const gridWidth = screenWidth - SCREEN_PADDING * 2;
  const cardWidth = (gridWidth - GAP * 2) / 3;
  const tileWidth = (gridWidth - GAP) / 2;

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
        <View>
          <SectionHeading title="Places" count={cityGroups.length} />
          <View style={styles.grid}>
            {cityGroups.map((group) => (
              <CityTile
                key={group.city.toLowerCase()}
                group={group}
                width={tileWidth}
                onPress={() => onPressCity?.(group)}
              />
            ))}
          </View>
        </View>
      )}

      {TOP_SHELVES.filter((shelf) => shelf.id !== 'go').map((shelf) => {
        const shelfRecs = recs.filter((rec) => shelf.categories.includes(rec.category));
        if (shelfRecs.length === 0) return null;
        return (
          <View key={shelf.id}>
            <SectionHeading title={shelf.label} count={shelfRecs.length} />
            <View style={styles.grid}>
              {shelfRecs.map((rec) => (
                <ReckieCard
                  key={rec.id}
                  rec={rec}
                  width={cardWidth}
                  reckiedBy={ownerNames?.[rec.id]}
                  onPress={() => onPressRec?.(rec)}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 26,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  empty: {
    paddingVertical: 56,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 19,
    color: Colors.ink,
  },
  emptyHint: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.ink2,
    textAlign: 'center',
  },
});
