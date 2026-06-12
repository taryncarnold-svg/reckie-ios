import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CityTile } from '@/components/city-tile';
import { ReckieCard } from '@/components/reckie-card';
import { SectionHeading } from '@/components/section-heading';
import { TopThreeInSection } from '@/components/top-three-in-section';
import { Colors, Fonts } from '@/constants/theme';
import { TOP_SHELVES, groupRecsByCity, type CityGroup } from '@/lib/categories';
import type { Category, Rec, TopListWithRecs } from '@/lib/types';

const H_PAD = 20;
const ROW_GAP = 12;
const TOP_THREE_MIN = 3;

type Props = {
  recs: Rec[];
  topLists?: TopListWithRecs[];
  /** Display name for "Taryn's Top 3" label on other profiles. */
  profileName?: string;
  isOwnProfile?: boolean;
  ownerNames?: Record<string, string>;
  selfLabel?: string;
  emptyMessage: string;
  emptyHint?: string;
  onPressRec?: (rec: Rec) => void;
  onPressCity?: (group: CityGroup) => void;
  onSeeAllTop3?: (category: Category) => void;
};

function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] || displayName;
}

function top3Label(displayName: string, isOwnProfile?: boolean): string {
  if (isOwnProfile) return 'Your Top 3';
  const name = firstName(displayName);
  return `${name}'s Top 3`;
}

function topListForCategory(topLists: TopListWithRecs[] | undefined, category: Category) {
  return topLists?.find((entry) => entry.list.category === category);
}

function shouldShowTop3(shelfRecCount: number, entry: TopListWithRecs | undefined): entry is TopListWithRecs {
  return shelfRecCount >= TOP_THREE_MIN && !!entry && entry.recs.length > 0;
}

/**
 * Catalogue: horizontal-scroll rows per category. Top 3 lives inside each
 * section when the category has 3+ reckies and a ranked list exists.
 */
export function CategorizedShelves({
  recs,
  topLists,
  profileName,
  isOwnProfile,
  ownerNames,
  selfLabel,
  emptyMessage,
  emptyHint,
  onPressRec,
  onPressCity,
  onSeeAllTop3,
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
  const top3LabelText = top3Label(profileName ?? 'Their', isOwnProfile);

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

        const category = shelf.categories[0];
        const topEntry = topListForCategory(topLists, category);
        const showTop3 = shouldShowTop3(shelfRecs.length, topEntry);
        const rankedIds = showTop3 ? new Set(topEntry.recs.slice(0, 3).map((r) => r.id)) : new Set<string>();
        const scrollRecs = showTop3 ? shelfRecs.filter((rec) => !rankedIds.has(rec.id)) : shelfRecs;

        return (
          <View key={shelf.id} style={styles.section}>
            <View style={styles.sectionPad}>
              <SectionHeading title={shelf.label} count={shelfRecs.length} />
            </View>

            {showTop3 && (
              <View style={styles.sectionPad}>
                <TopThreeInSection
                  label={top3LabelText}
                  recs={topEntry.recs}
                  onPressRec={onPressRec}
                  onSeeAll={isOwnProfile ? () => onSeeAllTop3?.(category) : undefined}
                />
              </View>
            )}

            {scrollRecs.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.rowContent}
                decelerationRate="fast">
                {scrollRecs.map((rec) => (
                  <ReckieCard
                    key={rec.id}
                    rec={rec}
                    reckiedBy={ownerNames?.[rec.id] ?? selfLabel}
                    onPress={() => onPressRec?.(rec)}
                  />
                ))}
              </ScrollView>
            )}

            <View style={styles.sectionDivider} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
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
    paddingTop: 2,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.line,
    marginHorizontal: H_PAD,
    marginTop: 14,
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
