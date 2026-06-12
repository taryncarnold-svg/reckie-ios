import { BlurView } from 'expo-blur';
import { StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/wordmark';
import { Colors, Fonts } from '@/constants/theme';

export const HEADER_BAR_HEIGHT = 44;

/** Absolute-positioned frosted header. Render it AFTER the scroll content (expo-blur known issue). */
export function BlurHeader({ title, wordmark = false }: { title?: string; wordmark?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <BlurView
      tint="systemChromeMaterialLight"
      intensity={85}
      style={[styles.header, { paddingTop: insets.top, height: insets.top + HEADER_BAR_HEIGHT }]}>
      {wordmark ? <Wordmark size={19} /> : <Text style={styles.title}>{title}</Text>}
    </BlurView>
  );
}

export function useHeaderHeight() {
  const insets = useSafeAreaInsets();
  return insets.top + HEADER_BAR_HEIGHT;
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.line,
  },
  title: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 15,
    color: Colors.ink,
  },
});
