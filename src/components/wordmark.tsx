import { StyleSheet, Text } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

/** "Reckie." in Fraunces — the period in oxblood is the accent (DESIGN.md §5). */
export function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <Text style={[styles.mark, { fontSize: size }]}>
      Reckie<Text style={styles.dot}>.</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  mark: {
    fontFamily: Fonts.display,
    color: Colors.ink,
  },
  dot: {
    color: Colors.oxblood,
  },
});
