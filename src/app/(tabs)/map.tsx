import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { BlurHeader } from '@/components/blur-header';
import { Colors, Fonts } from '@/constants/theme';

export default function MapScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.body}>
        <SymbolView name="map" size={44} tintColor={Colors.muted} />
        <Text style={styles.heading}>Map</Text>
        <Text style={styles.subtitle}>Your Go reckies, plotted on a map. Coming soon.</Text>
      </View>
      <BlurHeader title="Map" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 40,
  },
  heading: {
    fontFamily: Fonts.serif,
    fontSize: 26,
    fontWeight: '600',
    color: Colors.foreground,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
  },
});
