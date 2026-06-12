import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { Colors, Fonts } from '@/constants/theme';

type Props = {
  categoryLabel: string;
  onPress: () => void;
};

/** Shown when a category has 3+ reckies but no Top 3 list yet. */
export function TopThreeRankInvite({ categoryLabel, onPress }: Props) {
  return (
    <PressableScale style={styles.row} haptic="light" onPress={onPress}>
      <View style={styles.text}>
        <Text style={styles.title}>Rank your Top 3 {categoryLabel}</Text>
        <Text style={styles.hint}>Three picks that define your taste.</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.line2,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 14,
    color: Colors.ink,
  },
  hint: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.ink3,
  },
  chevron: {
    fontSize: 22,
    color: Colors.oxblood,
  },
});
