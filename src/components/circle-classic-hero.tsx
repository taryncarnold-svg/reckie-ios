import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { PressableScale } from '@/components/pressable-scale';
import { CategoryTints, Colors, Fonts, Radii } from '@/constants/theme';
import { CATEGORY_EMOJI, isLocationCategory } from '@/lib/categories';
import { formatReckonerNames, type CircleBrowseItem } from '@/lib/data';
import { getRecImageUrl, type Rec } from '@/lib/types';

type Props = {
  item: CircleBrowseItem;
  elevated?: boolean;
  onPress: (rec: Rec) => void;
};

function categoryChipLabel(rec: Rec): string {
  if (rec.category === 'watch') return 'Watch';
  if (rec.category === 'listen') return 'Listen';
  if (rec.category === 'read') return 'Read';
  if (rec.category === 'play') return 'Play';
  if (isLocationCategory(rec.category)) return 'Places';
  return rec.category;
}

/** Circle classic hero — 3+ people in circle reckied the same thing (DESIGN.md §9.3). */
export function CircleClassicHero({ item, elevated = true, onPress }: Props) {
  const { rec, reckoners, vouchCount, quote } = item;
  const imageUrl = getRecImageUrl(rec);
  const namesBold = formatReckonerNames(reckoners, 4);

  return (
    <View style={styles.wrap}>
      {elevated && (
        <>
          <View style={styles.stackBack} />
          <View style={styles.stackMid} />
        </>
      )}
      <PressableScale
        style={[styles.card, elevated && styles.cardElevated]}
        haptic="medium"
        onPress={() => onPress(rec)}>
        <View style={styles.imageZone}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          ) : (
            <LinearGradient colors={[CategoryTints[rec.category], '#36493D']} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(14,11,7,0.2)', 'rgba(14,11,7,0.94)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.seal}>
            <Text style={styles.sealText}>★ Loved by {vouchCount} of your circle</Text>
          </View>
          <View style={styles.catChip}>
            <Text style={styles.catChipText}>
              {CATEGORY_EMOJI[rec.category]} {categoryChipLabel(rec)}
            </Text>
          </View>

          <View style={styles.body}>
            <Text style={styles.title} numberOfLines={2}>
              {rec.title}
            </Text>
            {quote ? (
              <Text style={styles.quote} numberOfLines={2}>
                "{quote}"
              </Text>
            ) : null}
            <View style={styles.whoRow}>
              <View style={styles.faces}>
                {reckoners.slice(0, 4).map((p, i) => (
                  <View key={p.id} style={[styles.face, i > 0 && { marginLeft: -9 }]}>
                    <Avatar profile={p} size={30} />
                  </View>
                ))}
              </View>
              <Text style={styles.whoText} numberOfLines={2}>
                <Text style={styles.whoBold}>{namesBold}</Text> swear by this
              </Text>
            </View>
          </View>
        </View>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 20,
    position: 'relative',
  },
  stackBack: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: -7,
    height: 30,
    backgroundColor: '#F3EADB',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E9DCC4',
    borderRadius: 16,
    zIndex: 0,
  },
  stackMid: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: -3,
    height: 30,
    backgroundColor: '#F8F1E4',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#EBDFC8',
    borderRadius: 16,
    zIndex: 1,
  },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    zIndex: 2,
  },
  cardElevated: {
    shadowColor: '#A0781E',
    shadowOpacity: 0.22,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    borderWidth: 1.5,
    borderColor: '#E7C77E',
  },
  imageZone: {
    height: 230,
    position: 'relative',
  },
  seal: {
    position: 'absolute',
    top: 14,
    left: 14,
    zIndex: 3,
    backgroundColor: 'rgba(217,154,43,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    shadowColor: '#A06E14',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  sealText: {
    fontFamily: Fonts.sansBold,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: '#3A2A06',
  },
  catChip: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 3,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.pill,
  },
  catChipText: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 10.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#fff',
  },
  body: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingBottom: 16,
    zIndex: 3,
  },
  title: {
    fontFamily: Fonts.displayMedium,
    fontSize: 26,
    letterSpacing: -0.4,
    lineHeight: 28,
    color: '#fff',
    marginBottom: 8,
  },
  quote: {
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    lineHeight: 18,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 10,
  },
  whoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  faces: {
    flexDirection: 'row',
  },
  face: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 15,
  },
  whoText: {
    flex: 1,
    fontFamily: Fonts.sansSemiBold,
    fontSize: 12.5,
    color: '#fff',
  },
  whoBold: {
    color: '#F0D9A8',
  },
});
