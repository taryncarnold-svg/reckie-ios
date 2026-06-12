import * as Haptics from 'expo-haptics';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { Colors, Fonts, Radii } from '@/constants/theme';

type Props<T extends string> = {
  options: { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** Filter pills (DESIGN.md §5 buttons): paper bg + hairline; active = ink bg, white text. */
export function SegmentedTabs<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}>
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <PressableScale
            key={option.id}
            haptic="none"
            style={[styles.pill, selected && styles.pillActive]}
            onPress={() => {
              if (!selected) {
                Haptics.selectionAsync();
                onChange(option.id);
              }
            }}>
            <Text style={[styles.label, selected && styles.labelActive]}>{option.label}</Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    backgroundColor: Colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    borderRadius: Radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillActive: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  label: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.ink,
  },
  labelActive: {
    color: Colors.white,
  },
});
