import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { BlurHeader, useHeaderHeight } from '@/components/blur-header';
import { PressableScale } from '@/components/pressable-scale';
import { useReckieDetail } from '@/components/reckie-detail-sheet';
import { SectionHeading } from '@/components/section-heading';
import { Colors, Fonts, Radii } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { CATEGORY_EMOJI } from '@/lib/categories';
import { searchEverything, type SearchResults } from '@/lib/data';
import { getRecImageUrl } from '@/lib/types';

/** Search (PRODUCT.md §4): people and reckies across the catalogue. */
export default function SearchScreen() {
  const { session } = useAuth();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { openReckie } = useReckieDetail();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ people: [], reckies: [] });
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userId = session?.user.id;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const term = query.trim();
    if (!userId || term.length < 2) {
      setResults({ people: [], reckies: [] });
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const next = await searchEverything(userId, term);
        setResults(next);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, userId]);

  const hasQuery = query.trim().length >= 2;
  const empty = hasQuery && !searching && results.people.length === 0 && results.reckies.length === 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + 16,
          paddingBottom: tabBarHeight + 32,
          paddingHorizontal: 20,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}>
        <View style={styles.inputWrap}>
          <SymbolView name="magnifyingglass" size={16} tintColor={Colors.ink3} />
          <TextInput
            style={styles.input}
            placeholder="People, reckies…"
            placeholderTextColor={Colors.ink3}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>

        {results.people.length > 0 && (
          <View style={styles.section}>
            <SectionHeading title="People" />
            {results.people.map((member) => (
              <PressableScale
                key={member.profile.id}
                style={styles.row}
                haptic="light"
                onPress={() => router.push({ pathname: '/user/[id]', params: { id: member.profile.id } })}>
                <Avatar profile={member.profile} size={42} />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {member.profile.name ?? member.profile.handle ?? 'Someone'}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {member.rec_count} {member.rec_count === 1 ? 'reckie' : 'reckies'}
                    {member.cosign_count > 0 ? ` · ${member.cosign_count} co-signs` : ''}
                  </Text>
                </View>
              </PressableScale>
            ))}
          </View>
        )}

        {results.reckies.length > 0 && (
          <View style={styles.section}>
            <SectionHeading title="Reckies" />
            {results.reckies.map(({ rec, profile }) => {
              const imageUrl = getRecImageUrl(rec);
              return (
                <PressableScale
                  key={rec.id}
                  style={styles.row}
                  haptic="light"
                  onPress={() => openReckie({ rec })}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.thumb} contentFit="cover" transition={150} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbFallback]}>
                      <Text style={styles.thumbEmoji}>{CATEGORY_EMOJI[rec.category] ?? '✨'}</Text>
                    </View>
                  )}
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {rec.title}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {profile ? `reckied by ${profile.name ?? profile.handle}` : rec.category}
                    </Text>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        )}

        {empty && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing yet</Text>
            <Text style={styles.emptyHint}>No people or reckies match “{query.trim()}”.</Text>
          </View>
        )}

        {!hasQuery && (
          <View style={styles.empty}>
            <Text style={styles.emptyHint}>Find people in your circle, or anything anyone has reckied.</Text>
          </View>
        )}
      </ScrollView>
      <BlurHeader title="Search" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    borderRadius: Radii.input,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 18,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.ink,
  },
  section: {
    marginBottom: 22,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontFamily: Fonts.sansMedium,
    fontSize: 15,
    color: Colors.ink,
  },
  rowMeta: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.ink3,
  },
  thumb: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.paper,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
  },
  thumbEmoji: {
    fontSize: 17,
  },
  empty: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 6,
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
