import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

/** Section header (DESIGN.md §3): 13px Inter 600, uppercase-ish, slight tracking. */
export function SectionHeading({ title, count }: { title: string; count?: number }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      {count !== undefined ? <Text style={styles.count}>{count}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 7,
    marginBottom: 12,
  },
  title: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 12.5,
    letterSpacing: 1.1,
    color: Colors.ink,
  },
  count: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.ink3,
  },
});
