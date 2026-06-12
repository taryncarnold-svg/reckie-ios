import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { Colors, Fonts, Radii } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { CATEGORY_EMOJI } from '@/lib/categories';
import { TOP_LIST_LABELS, saveTopList } from '@/lib/data';
import { notifyDataChanged } from '@/lib/refresh';
import { getRecImageUrl, type Category, type Rec, type TopListWithRecs } from '@/lib/types';

export type TopEightEditorRef = {
  /** Open the editor. Pass the existing list (if any) to edit it. */
  present: (myRecs: Rec[], existing: TopListWithRecs[]) => void;
};

type Step = 'category' | 'rank';

/**
 * Top 8 editor (PRODUCT.md §8): pick a category, then tap reckies in the
 * order you rank them. Tap order = rank; tap again to remove.
 */
export const TopEightEditor = forwardRef<TopEightEditorRef>(function TopEightEditor(_props, ref) {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);

  const [step, setStep] = useState<Step>('category');
  const [myRecs, setMyRecs] = useState<Rec[]>([]);
  const [existing, setExisting] = useState<TopListWithRecs[]>([]);
  const [category, setCategory] = useState<Category>('eat');
  const [ranked, setRanked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    present: (recs, lists) => {
      setMyRecs(recs);
      setExisting(lists);
      setStep('category');
      setError(null);
      sheetRef.current?.present();
    },
  }));

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.4} />
    ),
    []
  );

  // Only offer categories the user actually has reckies in.
  const categoryOptions = useMemo(() => {
    const counts = new Map<Category, number>();
    for (const rec of myRecs) counts.set(rec.category, (counts.get(rec.category) ?? 0) + 1);
    return [...counts.entries()].map(([cat, count]) => ({
      category: cat,
      count,
      hasList: existing.some((entry) => entry.list.category === cat),
    }));
  }, [myRecs, existing]);

  const pickCategory = (cat: Category) => {
    setCategory(cat);
    const current = existing.find((entry) => entry.list.category === cat);
    setRanked(current ? current.recs.map((rec) => rec.id) : []);
    setStep('rank');
  };

  const toggle = (recId: string) => {
    Haptics.selectionAsync();
    setRanked((prev) => {
      if (prev.includes(recId)) return prev.filter((id) => id !== recId);
      if (prev.length >= 8) return prev;
      return [...prev, recId];
    });
  };

  const save = async () => {
    const userId = session?.user.id;
    if (!userId || saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveTopList(userId, category, ranked);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      sheetRef.current?.dismiss();
      notifyDataChanged();
    } catch (saveError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(saveError instanceof Error ? saveError.message : 'Could not save — try again.');
    } finally {
      setSaving(false);
    }
  };

  const candidates = myRecs.filter((rec) => rec.category === category);
  const hadList = existing.some((entry) => entry.list.category === category);

  const renderCandidate = useCallback(
    ({ item }: { item: Rec }) => {
      const position = ranked.indexOf(item.id);
      const picked = position >= 0;
      const imageUrl = getRecImageUrl(item);
      return (
        <PressableScale
          style={[styles.candidateRow, picked && styles.candidateRowPicked]}
          haptic="none"
          onPress={() => toggle(item.id)}>
          <View style={[styles.rankBadge, picked && styles.rankBadgeOn]}>
            {picked ? <Text style={styles.rankBadgeText}>{position + 1}</Text> : null}
          </View>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.thumb} contentFit="cover" transition={120} />
          ) : (
            <View style={[styles.thumb, styles.thumbFallback]}>
              <Text>{CATEGORY_EMOJI[item.category] ?? '✨'}</Text>
            </View>
          )}
          <View style={styles.candidateText}>
            <Text style={styles.candidateTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {item.city ? (
              <Text style={styles.candidateMeta} numberOfLines={1}>
                {item.city}
              </Text>
            ) : null}
          </View>
        </PressableScale>
      );
    },
    [ranked]
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={['80%']}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}>
      {step === 'category' && (
        <BottomSheetView style={styles.content}>
          <Text style={styles.title}>Your Top 8</Text>
          <Text style={styles.subtitle}>Pick a category to rank. Ranking is identity.</Text>
          <View style={styles.categoryList}>
            {categoryOptions.map((option) => (
              <PressableScale
                key={option.category}
                style={styles.categoryRow}
                haptic="selection"
                onPress={() => pickCategory(option.category)}>
                <Text style={styles.categoryEmoji}>{CATEGORY_EMOJI[option.category]}</Text>
                <View style={styles.categoryTextWrap}>
                  <Text style={styles.categoryLabel}>{TOP_LIST_LABELS[option.category]}</Text>
                  <Text style={styles.categoryMeta}>
                    {option.count} {option.count === 1 ? 'reckie' : 'reckies'}
                    {option.hasList ? ' · ranked' : ''}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </PressableScale>
            ))}
            {categoryOptions.length === 0 && (
              <Text style={styles.emptyText}>Add a few reckies first — then come rank them.</Text>
            )}
          </View>
        </BottomSheetView>
      )}

      {step === 'rank' && (
        <View style={styles.rankContainer}>
          <View style={styles.content}>
            <View style={styles.stepHeader}>
              <PressableScale haptic="selection" onPress={() => setStep('category')} style={styles.backBtn}>
                <Text style={styles.backText}>‹ Back</Text>
              </PressableScale>
              <Text style={styles.stepTitle}>Top {TOP_LIST_LABELS[category]}</Text>
            </View>
            <Text style={styles.rankHint}>
              Tap in the order you rank them — first tap is #1. Up to 8.
            </Text>
          </View>
          <BottomSheetFlatList
            data={candidates}
            keyExtractor={(item: Rec) => item.id}
            renderItem={renderCandidate}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
            extraData={ranked}
          />
          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            <PressableScale
              style={[styles.saveBtn, ranked.length === 0 && !hadList && styles.saveBtnDisabled]}
              haptic="medium"
              onPress={save}
              disabled={saving || (ranked.length === 0 && !hadList)}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {ranked.length === 0
                    ? hadList
                      ? 'Remove list'
                      : 'Save'
                    : `Save Top ${ranked.length}`}
                </Text>
              )}
            </PressableScale>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        </View>
      )}
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: Colors.white,
    borderRadius: 24,
  },
  handle: {
    backgroundColor: Colors.borderStrong,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  rankContainer: {
    flex: 1,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.ink,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 10,
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.ink2,
  },
  categoryList: {
    marginTop: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.lineSoft,
  },
  categoryEmoji: {
    fontSize: 22,
  },
  categoryTextWrap: {
    flex: 1,
    gap: 1,
  },
  categoryLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 15.5,
    color: Colors.ink,
  },
  categoryMeta: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.ink3,
  },
  chevron: {
    fontSize: 20,
    color: Colors.ink3,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 6,
  },
  backText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 15,
    color: Colors.oxblood,
  },
  stepTitle: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: 19,
    color: Colors.ink,
  },
  rankHint: {
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    color: Colors.ink3,
    marginBottom: 10,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginHorizontal: -10,
    borderRadius: Radii.md,
  },
  candidateRowPicked: {
    backgroundColor: Colors.marigoldSoft,
    marginBottom: 2,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: Colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeOn: {
    backgroundColor: Colors.marigold,
    borderColor: Colors.marigold,
  },
  rankBadgeText: {
    fontFamily: Fonts.display,
    fontSize: 13,
    color: '#fff',
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 9,
    backgroundColor: Colors.paper,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
  },
  candidateText: {
    flex: 1,
    gap: 1,
  },
  candidateTitle: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14.5,
    color: Colors.ink,
  },
  candidateMeta: {
    fontFamily: Fonts.sans,
    fontSize: 11.5,
    color: Colors.ink3,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.line,
  },
  saveBtn: {
    backgroundColor: Colors.ink,
    borderRadius: Radii.button,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    fontFamily: Fonts.sansSemiBold,
    color: '#fff',
    fontSize: 15.5,
  },
  errorText: {
    marginTop: 8,
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.oxblood,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 20,
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.ink2,
    textAlign: 'center',
  },
});
