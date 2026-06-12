import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { Colors, Fonts, Radii } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { findCanonicalForExternal } from '@/lib/data';
import { notifyDataChanged } from '@/lib/refresh';
import {
  ADD_PICK_OPTIONS,
  ADD_PICK_SECTIONS,
  searchReckies,
  searchResultToPayload,
  type AddPickKind,
  type SearchResult,
} from '@/lib/search-api';
import { supabase } from '@/lib/supabase';
import { NOTE_INPUT_PROPS, SEARCH_INPUT_PROPS } from '@/lib/text-input-props';

type Step = 'pick' | 'search' | 'note';

export type AddReckieSheetRef = { present: () => void };

/** Add flow mirroring the web AddRecSheet: pick kind → search → note → save. */
export const AddReckieSheet = forwardRef<AddReckieSheetRef>(function AddReckieSheet(_props, ref) {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);

  const [step, setStep] = useState<Step>('pick');
  const [kind, setKind] = useState<AddPickKind>('eat');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [note, setNote] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    present: () => {
      setStep('pick');
      setQuery('');
      setResults([]);
      setSelected(null);
      setNote('');
      setCity('');
      setError(null);
      sheetRef.current?.present();
    },
  }));

  const isLocationKind = ADD_PICK_OPTIONS[kind].dbCategory === 'eat' ||
    ADD_PICK_OPTIONS[kind].dbCategory === 'drink' ||
    ADD_PICK_OPTIONS[kind].dbCategory === 'do';

  const choose = (item: SearchResult) => {
    setSelected(item);
    setCity(item.city ?? '');
    setStep('note');
  };

  // Manual fallback: the thing you love might not be in any database.
  const chooseManual = () => {
    choose({
      id: `manual-${Date.now()}`,
      title: query.trim(),
      category: ADD_PICK_OPTIONS[kind].dbCategory,
      context: 'Added by you',
      coverImageUrl: null,
      provider: 'manual',
    });
  };

  // Debounced search against the web app's API.
  useEffect(() => {
    if (step !== 'search' || query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchReckies(query, kind, controller.signal)
        .then((found) => {
          setResults(found);
          setSearching(false);
        })
        .catch((searchError) => {
          if (searchError?.name !== 'AbortError') {
            setSearching(false);
            setError('Search failed — check your connection.');
          }
        });
    }, 350);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, kind, step]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.4} />
    ),
    []
  );

  const save = async () => {
    const userId = session?.user.id;
    if (!userId || !selected || saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = searchResultToPayload(selected, userId, note);

      // City capture for places (Eat / Drink / Do) — powers the Places shelf + map.
      if (isLocationKind) {
        payload.city = city.trim() || payload.city || null;
      }

      // Join the canonical group if anyone has already reckied this thing
      // (null = this rec becomes its own canonical seed).
      if (payload.external_id && payload.external_source) {
        payload.canonical_id = await findCanonicalForExternal(payload.external_id, payload.external_source);
      }

      // Dedupe like the web's findMatchingRec: same external id, else same title.
      let existingId: string | null = null;
      if (payload.external_id && payload.external_source) {
        const { data } = await supabase
          .from('recs')
          .select('id')
          .eq('user_id', userId)
          .eq('external_id', payload.external_id)
          .eq('external_source', payload.external_source)
          .maybeSingle();
        existingId = data?.id ?? null;
      }
      if (!existingId) {
        const { data } = await supabase
          .from('recs')
          .select('id, title')
          .eq('user_id', userId)
          .ilike('title', payload.title)
          .maybeSingle();
        existingId = data?.id ?? null;
      }

      if (existingId) {
        const { error: updateError } = await supabase
          .from('recs')
          .update({ note: payload.note })
          .eq('id', existingId)
          .eq('user_id', userId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('recs').insert(payload);
        if (insertError) throw insertError;
      }

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

  const renderResult = useCallback(
    ({ item }: { item: SearchResult }) => (
      <PressableScale style={styles.resultRow} haptic="selection" onPress={() => choose(item)}>
        <View style={styles.resultThumb}>
          {item.coverImageUrl ? (
            <Image source={{ uri: item.coverImageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={styles.resultThumbFallback}>
              <Text>{ADD_PICK_OPTIONS[kind].emoji}</Text>
            </View>
          )}
        </View>
        <View style={styles.resultText}>
          <Text style={styles.resultTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.resultContext} numberOfLines={1}>
            {item.context}
          </Text>
        </View>
      </PressableScale>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kind]
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={['85%']}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}>
      {step === 'pick' && (
        <BottomSheetView style={styles.content}>
          <Text style={styles.title}>Add a reckie</Text>
          <Text style={styles.subtitle}>What kind of thing is it?</Text>
          {ADD_PICK_SECTIONS.map((section) => (
            <View key={section.title} style={styles.pickSection}>
              <Text style={styles.pickSectionTitle}>{section.title}</Text>
              <View style={styles.pickGrid}>
                {section.options.map((option) => (
                  <PressableScale
                    key={option}
                    style={styles.pickOption}
                    haptic="selection"
                    onPress={() => {
                      setKind(option);
                      setQuery('');
                      setResults([]);
                      setStep('search');
                    }}>
                    <Text style={styles.pickEmoji}>{ADD_PICK_OPTIONS[option].emoji}</Text>
                    <Text style={styles.pickLabel}>{ADD_PICK_OPTIONS[option].label}</Text>
                  </PressableScale>
                ))}
              </View>
            </View>
          ))}
        </BottomSheetView>
      )}

      {step === 'search' && (
        <View style={styles.searchContainer}>
          <View style={styles.content}>
            <View style={styles.stepHeader}>
              <PressableScale haptic="selection" onPress={() => setStep('pick')} style={styles.backBtn}>
                <Text style={styles.backText}>‹ Back</Text>
              </PressableScale>
              <Text style={styles.stepTitle}>
                {ADD_PICK_OPTIONS[kind].emoji} {ADD_PICK_OPTIONS[kind].label}
              </Text>
            </View>
            <BottomSheetTextInput
              style={styles.input}
              placeholder={`Search for a ${ADD_PICK_OPTIONS[kind].label.toLowerCase()}…`}
              placeholderTextColor={Colors.muted}
              value={query}
              onChangeText={setQuery}
              autoFocus
              returnKeyType="search"
              {...SEARCH_INPUT_PROPS}
            />
          </View>
          <BottomSheetFlatList
            data={results}
            keyExtractor={(item: SearchResult) => item.id}
            renderItem={renderResult}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              searching ? (
                <ActivityIndicator style={styles.listSpinner} color={Colors.muted} />
              ) : query.trim().length >= 2 ? (
                <Text style={styles.emptyText}>No results — add it yourself below.</Text>
              ) : (
                <Text style={styles.emptyText}>Type at least 2 characters to search.</Text>
              )
            }
            ListFooterComponent={
              query.trim().length >= 2 && !searching ? (
                <PressableScale style={styles.manualRow} haptic="selection" onPress={chooseManual}>
                  <View style={styles.manualPlus}>
                    <Text style={styles.manualPlusText}>＋</Text>
                  </View>
                  <View style={styles.resultText}>
                    <Text style={styles.resultTitle} numberOfLines={1}>
                      Add “{query.trim()}” yourself
                    </Text>
                    <Text style={styles.resultContext}>Not in the database? No problem.</Text>
                  </View>
                </PressableScale>
              ) : null
            }
          />
        </View>
      )}

      {step === 'note' && selected && (
        <BottomSheetView style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.stepHeader}>
            <PressableScale haptic="selection" onPress={() => setStep('search')} style={styles.backBtn}>
              <Text style={styles.backText}>‹ Back</Text>
            </PressableScale>
            <Text style={styles.stepTitle} numberOfLines={1}>
              {selected.title}
            </Text>
          </View>
          {isLocationKind && (
            <BottomSheetTextInput
              style={styles.input}
              placeholder="Which city? (e.g. Los Angeles)"
              placeholderTextColor={Colors.muted}
              value={city}
              onChangeText={setCity}
              {...NOTE_INPUT_PROPS}
              autoCapitalize="words"
            />
          )}
          <Text style={styles.noteHint}>Why do you reckie it? (This is the heart of it.)</Text>
          <BottomSheetTextInput
            style={[styles.input, styles.noteInput]}
            placeholder="“The squash blossom quesadilla changed me.”"
            placeholderTextColor={Colors.muted}
            value={note}
            onChangeText={setNote}
            multiline
            autoFocus
            {...NOTE_INPUT_PROPS}
          />
          <PressableScale style={styles.saveBtn} haptic="medium" onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save reckie</Text>}
          </PressableScale>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </BottomSheetView>
      )}
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: Colors.background,
    borderRadius: 24,
  },
  handle: {
    backgroundColor: Colors.borderStrong,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  searchContainer: {
    flex: 1,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 24,
    fontWeight: '600',
    color: Colors.foreground,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 8,
    fontSize: 14,
    color: Colors.muted,
  },
  pickSection: {
    marginTop: 14,
  },
  pickSectionTitle: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 8,
  },
  pickGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  pickOption: {
    flex: 1,
    backgroundColor: Colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderStrong,
    borderRadius: Radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 5,
  },
  pickEmoji: {
    fontSize: 24,
  },
  pickLabel: {
    fontSize: 12.5,
    fontWeight: '500',
    color: Colors.foreground,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 6,
  },
  backText: {
    fontSize: 15,
    color: Colors.accent,
    fontWeight: '500',
  },
  stepTitle: {
    flex: 1,
    fontFamily: Fonts.serif,
    fontSize: 19,
    fontWeight: '600',
    color: Colors.foreground,
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderStrong,
    borderRadius: Radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.foreground,
    marginBottom: 12,
  },
  noteInput: {
    minHeight: 110,
    textAlignVertical: 'top',
    fontFamily: Fonts.serif,
    fontSize: 17,
    lineHeight: 24,
  },
  noteHint: {
    fontSize: 13,
    color: Colors.muted,
    marginBottom: 10,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
  },
  resultThumb: {
    width: 48,
    height: 48,
    borderRadius: Radii.sm,
    overflow: 'hidden',
    backgroundColor: '#f1efe9',
  },
  resultThumbFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultText: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15.5,
    fontWeight: '600',
    color: Colors.foreground,
  },
  resultContext: {
    marginTop: 1,
    fontSize: 12.5,
    color: Colors.muted,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    marginTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.line,
  },
  manualPlus: {
    width: 48,
    height: 48,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.line,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualPlusText: {
    fontSize: 18,
    color: Colors.ink2,
  },
  listSpinner: {
    marginTop: 28,
  },
  emptyText: {
    marginTop: 28,
    textAlign: 'center',
    fontSize: 14,
    color: Colors.muted,
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radii.md,
    paddingVertical: 15,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 10,
    fontSize: 13,
    color: Colors.accent,
    textAlign: 'center',
  },
});
