import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

/** Section header (mockup): Inter 700 uppercase + faint count. */
export function SectionHeading({ title, count }: { title: string; count?: number }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {title.toUpperCase()}
        {count !== undefined ? <Text style={styles.count}> {count}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  title: {
    fontFamily: Fonts.sansBold,
    fontSize: 12,
    letterSpacing: 0.96,
    color: Colors.ink,
  },
  count: {
    fontFamily: Fonts.sansBold,
    color: '#B9B2A6',
  },
});
