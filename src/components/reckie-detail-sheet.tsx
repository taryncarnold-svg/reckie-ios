import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { PressableScale } from '@/components/pressable-scale';
import { CategoryTints, Colors, Fonts, Radii } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { CATEGORY_EMOJI, isPortraitCategory } from '@/lib/categories';
import {
  addCosign,
  deleteRec,
  fetchCosignStack,
  fetchLineage,
  fetchTriedForRec,
  markTried,
  passOnReckie,
  setSaved,
  unmarkTried,
} from '@/lib/data';
import { notifyDataChanged } from '@/lib/refresh';
import { supabase } from '@/lib/supabase';
import { getRecImageUrl, type CosignWithProfile, type Profile, type Rec, type Tried } from '@/lib/types';

type OpenOptions = {
  rec: Rec;
  /** Called after any mutation so the opening screen can refresh. */
  onChanged?: () => void;
};

const ReckieDetailContext = createContext<{ openReckie: (options: OpenOptions) => void }>({
  openReckie: () => {},
});

export function useReckieDetail() {
  return useContext(ReckieDetailContext);
}

function categoryLabel(rec: Rec): string {
  const labels: Record<string, string> = {
    eat: 'Eat',
    drink: 'Drink',
    do: 'Do',
    watch: rec.metadata?.type === 'series' ? 'Show' : 'Watch',
    read: 'Read',
    play: 'Play',
    listen: 'Listen',
  };
  return labels[rec.category] ?? rec.category;
}

function contextLine(rec: Rec): string | null {
  const parts: string[] = [];
  if (rec.metadata?.year) parts.push(String(rec.metadata.year));
  if (rec.metadata?.artist) parts.push(String(rec.metadata.artist));
  if (rec.metadata?.author) parts.push(String(rec.metadata.author));
  if (rec.metadata?.watch_provider) parts.push(String(rec.metadata.watch_provider));
  return parts.length ? parts.join(' · ') : null;
}

function externalScore(rec: Rec): string | null {
  if (rec.external_rating_label && rec.external_rating_value) {
    return `${rec.external_rating_label} ${rec.external_rating_value}`;
  }
  return null;
}

function displayName(profile: Profile | null): string {
  return profile?.name ?? profile?.handle ?? 'Someone';
}

export function ReckieDetailProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);

  const [options, setOptions] = useState<OpenOptions | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [cosigns, setCosigns] = useState<CosignWithProfile[]>([]);
  const [stackExpanded, setStackExpanded] = useState(false);
  const [originatorName, setOriginatorName] = useState<string | null>(null);
  const [saved, setSavedState] = useState(false);
  const [tried, setTriedState] = useState<Tried | null>(null);
  const [triedNote, setTriedNote] = useState('');
  const [composing, setComposing] = useState(false);
  const [take, setTake] = useState('');
  const [busy, setBusy] = useState(false);

  const userId = session?.user.id;
  const rec = options?.rec ?? null;
  const isOwner = !!rec && rec.user_id === userId;

  const openReckie = useCallback((next: OpenOptions) => {
    setOptions(next);
    setOwner(null);
    setCosigns([]);
    setStackExpanded(false);
    setOriginatorName(null);
    setSavedState(false);
    setTriedState(null);
    setTriedNote('');
    setComposing(false);
    setTake('');
    sheetRef.current?.present();
  }, []);

  // Load the social layer when a reckie opens.
  useEffect(() => {
    if (!rec || !userId) return;
    let cancelled = false;

    supabase
      .from('profiles')
      .select('*')
      .eq('id', rec.user_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setOwner((data as Profile) ?? null);
      });

    fetchCosignStack(rec)
      .then((stack) => {
        if (!cancelled) setCosigns(stack);
      })
      .catch(() => {});

    fetchTriedForRec(userId, rec).then((row) => {
      if (!cancelled) {
        setTriedState(row);
        setTriedNote(row?.private_note ?? '');
      }
    });

    if (!isOwner) {
      supabase
        .from('saves')
        .select('rec_id')
        .eq('user_id', userId)
        .eq('rec_id', rec.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!cancelled) setSavedState(!!data);
        });
    }

    if (rec.source_reckie_id) {
      fetchLineage(rec)
        .then((chain) => {
          const root = chain[chain.length - 1];
          if (!cancelled && root) setOriginatorName(displayName(root.profile));
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [rec, userId, isOwner]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.4} />
    ),
    []
  );

  const refresh = () => options?.onChanged?.();

  const toggleSave = async () => {
    if (!rec || !userId || busy) return;
    setBusy(true);
    try {
      await setSaved(userId, rec, !saved);
      setSavedState(!saved);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refresh();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  };

  const toggleTried = async () => {
    if (!rec || !userId || busy) return;
    setBusy(true);
    try {
      if (tried) {
        await unmarkTried(userId, rec);
        setTriedState(null);
        setTriedNote('');
      } else {
        await markTried(userId, rec);
        const row = await fetchTriedForRec(userId, rec);
        setTriedState(row);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refresh();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  };

  const updateTriedDetails = async (loved: boolean | null, privateNote: string) => {
    if (!rec || !userId) return;
    await markTried(userId, rec, { loved, privateNote });
    const row = await fetchTriedForRec(userId, rec);
    setTriedState(row);
  };

  const submitPassOn = async () => {
    if (!rec || !userId || busy || !take.trim()) return;
    setBusy(true);
    try {
      await passOnReckie(userId, rec, take);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      sheetRef.current?.dismiss();
      notifyDataChanged();
      refresh();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  };

  const submitCosignOnly = async () => {
    if (!rec || !userId || busy) return;
    setBusy(true);
    try {
      await addCosign(userId, rec, take);
      const stack = await fetchCosignStack(rec);
      setCosigns(stack);
      setComposing(false);
      setTake('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refresh();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    if (!rec || !userId) return;
    Alert.alert('Delete reckie', `Delete “${rec.title}”? This can’t be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteRec(userId, rec.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          sheetRef.current?.dismiss();
          refresh();
          notifyDataChanged();
        },
      },
    ]);
  };

  const imageUrl = rec ? getRecImageUrl(rec) : null;
  const portrait = rec ? isPortraitCategory(rec.category) : false;
  const score = rec ? externalScore(rec) : null;
  const context = rec ? contextLine(rec) : null;
  const otherCosigns = cosigns.filter((c) => c.user_id !== rec?.user_id);
  const alreadyCosigned = !!userId && cosigns.some((c) => c.user_id === userId);

  return (
    <ReckieDetailContext.Provider value={{ openReckie }}>
      {children}
      <BottomSheetModal
        ref={sheetRef}
        backdropComponent={renderBackdrop}
        enableDynamicSizing
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}>
        <BottomSheetScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
          {rec && !composing && (
            <>
              {/* Hero image with category + city chip */}
              <View style={[styles.hero, { aspectRatio: portrait ? 16 / 10 : 16 / 9 }]}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: CategoryTints[rec.category], opacity: 0.25 }]} />
                )}
                <View style={styles.heroChip}>
                  <Text style={styles.heroChipText}>
                    {CATEGORY_EMOJI[rec.category]} {categoryLabel(rec)}
                    {rec.city ? ` · ${rec.city}` : ''}
                  </Text>
                </View>
              </View>

              <Text style={styles.title}>{rec.title}</Text>
              {context ? <Text style={styles.context}>{context}</Text> : null}

              {/* Who reckied it — one clean line, no date */}
              <View style={styles.attribution}>
                <Avatar profile={owner} size={22} />
                <Text style={styles.attributionText} numberOfLines={1}>
                  Reckied by {isOwner ? 'you' : displayName(owner)}
                </Text>
                {otherCosigns.length > 0 && (
                  <PressableScale
                    style={styles.facesRow}
                    haptic="selection"
                    onPress={() => setStackExpanded(!stackExpanded)}>
                    {otherCosigns.slice(0, 3).map((cosign, index) => (
                      <View key={cosign.id} style={[styles.face, { marginLeft: index === 0 ? 0 : -7 }]}>
                        <Avatar profile={cosign.profile} size={20} />
                      </View>
                    ))}
                    <Text style={styles.facesCount}>+{otherCosigns.length}</Text>
                  </PressableScale>
                )}
              </View>

              {/* The note — a text from a friend, not a pull-quote */}
              {rec.note ? <Text style={styles.note}>{rec.note.trim()}</Text> : null}

              {/* Lineage, subtle */}
              {originatorName ? (
                <Text style={styles.lineage}>originally {originatorName}’s find</Text>
              ) : null}

              {/* Co-sign stack, expandable */}
              {otherCosigns.length > 0 && stackExpanded && (
                <View style={styles.stack}>
                  {otherCosigns.map((cosign) => (
                    <View key={cosign.id} style={styles.stackRow}>
                      <Avatar profile={cosign.profile} size={26} />
                      <View style={styles.stackText}>
                        <Text style={styles.stackName}>{displayName(cosign.profile)}</Text>
                        {cosign.note ? <Text style={styles.stackTake}>{cosign.note}</Text> : null}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Trust signal + tags */}
              {(score || (rec.tags?.length ?? 0) > 0) && (
                <View style={styles.chipRow}>
                  {score ? (
                    <View style={styles.scoreChip}>
                      <Text style={styles.scoreChipText}>{score}</Text>
                    </View>
                  ) : null}
                  {(rec.tags ?? []).map((tag) => (
                    <View key={tag} style={styles.tagPill}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Primary action-link (silent affiliate slot) */}
              <View style={styles.footer}>
                {rec.primary_action_url && (
                  <PressableScale
                    style={styles.primaryCta}
                    haptic="medium"
                    onPress={() => Linking.openURL(rec.primary_action_url!)}>
                    <Text style={styles.primaryCtaText}>{rec.primary_action_label ?? 'Open'}</Text>
                  </PressableScale>
                )}

                {/* Loop actions: Save · I tried this · Reckie it */}
                {!isOwner && (
                  <View style={styles.loopRow}>
                    <PressableScale
                      style={[styles.loopBtn, saved && styles.loopBtnActive]}
                      haptic="light"
                      onPress={toggleSave}
                      disabled={busy}>
                      <Text style={[styles.loopBtnText, saved && styles.loopBtnTextActive]}>
                        {saved ? 'Saved ✓' : 'Save'}
                      </Text>
                    </PressableScale>
                    <PressableScale
                      style={[styles.loopBtn, !!tried && styles.loopBtnActive]}
                      haptic="light"
                      onPress={toggleTried}
                      disabled={busy}>
                      <Text style={[styles.loopBtnText, !!tried && styles.loopBtnTextActive]}>
                        {tried ? 'Tried ✓' : 'I tried this'}
                      </Text>
                    </PressableScale>
                    <PressableScale
                      style={[styles.loopBtn, alreadyCosigned && styles.loopBtnActive]}
                      haptic="light"
                      onPress={() => {
                        if (!alreadyCosigned) setComposing(true);
                      }}
                      disabled={busy || alreadyCosigned}>
                      <Text style={[styles.loopBtnText, alreadyCosigned && styles.loopBtnTextActive]}>
                        {alreadyCosigned ? 'Reckied ✓' : 'Reckie it'}
                      </Text>
                    </PressableScale>
                  </View>
                )}

                {/* Private life-log, revealed once tried */}
                {!isOwner && tried && (
                  <View style={styles.triedPanel}>
                    <View style={styles.triedHeader}>
                      <Text style={styles.triedLabel}>Just for you</Text>
                      <PressableScale
                        haptic="selection"
                        onPress={() => updateTriedDetails(tried.loved ? null : true, triedNote)}>
                        <Text style={[styles.lovedToggle, tried.loved && styles.lovedToggleActive]}>
                          {tried.loved ? '♥ Loved it' : '♡ Loved it?'}
                        </Text>
                      </PressableScale>
                    </View>
                    <BottomSheetTextInput
                      style={styles.triedInput}
                      placeholder="Private note — only you see this"
                      placeholderTextColor={Colors.ink3}
                      value={triedNote}
                      onChangeText={setTriedNote}
                      onEndEditing={() => updateTriedDetails(tried.loved ?? null, triedNote)}
                      multiline
                    />
                  </View>
                )}

                {isOwner && (
                  <PressableScale style={styles.deleteBtn} haptic="light" onPress={confirmDelete}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </PressableScale>
                )}
              </View>
            </>
          )}

          {/* "Reckie it" compose: pass it on with your take */}
          {rec && composing && (
            <View style={styles.compose}>
              <Text style={styles.composeTitle}>Reckie {rec.title}</Text>
              <Text style={styles.composeHint}>
                Your take — like a text to a friend. It joins {isOwner ? 'the' : `${displayName(owner)}’s`} co-sign
                stack and lands on your shelf.
              </Text>
              <BottomSheetTextInput
                style={styles.composeInput}
                placeholder="Trust me on the squash blossom quesadilla."
                placeholderTextColor={Colors.ink3}
                value={take}
                onChangeText={setTake}
                multiline
                autoFocus
              />
              <PressableScale
                style={[styles.primaryCta, !take.trim() && styles.primaryCtaDisabled]}
                haptic="medium"
                onPress={submitPassOn}
                disabled={busy || !take.trim()}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryCtaText}>Reckie it</Text>}
              </PressableScale>
              <PressableScale style={styles.composeSecondary} haptic="selection" onPress={submitCosignOnly} disabled={busy}>
                <Text style={styles.composeSecondaryText}>Just co-sign, don’t add to my shelf</Text>
              </PressableScale>
              <PressableScale
                style={styles.composeCancel}
                haptic="selection"
                onPress={() => {
                  setComposing(false);
                  setTake('');
                }}>
                <Text style={styles.composeCancelText}>Cancel</Text>
              </PressableScale>
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    </ReckieDetailContext.Provider>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: Colors.white,
    borderRadius: 24,
  },
  handle: {
    backgroundColor: Colors.line,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  hero: {
    borderRadius: Radii.lg,
    overflow: 'hidden',
    backgroundColor: Colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
  },
  heroChip: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: Colors.white,
    borderRadius: Radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroChipText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 11.5,
    color: Colors.ink,
  },
  title: {
    marginTop: 16,
    fontFamily: Fonts.display,
    fontSize: 23,
    color: Colors.ink,
    lineHeight: 28,
  },
  context: {
    marginTop: 3,
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    color: Colors.ink2,
  },
  attribution: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  attributionText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13.5,
    color: Colors.ink,
    flexShrink: 1,
  },
  facesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 2,
  },
  face: {
    borderWidth: 1.5,
    borderColor: Colors.white,
    borderRadius: 11,
  },
  facesCount: {
    marginLeft: 5,
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: Colors.ink2,
  },
  note: {
    marginTop: 14,
    fontFamily: Fonts.note,
    fontSize: 16.5,
    lineHeight: 24,
    color: Colors.ink,
  },
  lineage: {
    marginTop: 8,
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.ink3,
  },
  stack: {
    marginTop: 14,
    backgroundColor: Colors.oxbloodSoft,
    borderRadius: Radii.lg,
    padding: 14,
    gap: 12,
  },
  stackRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stackText: {
    flex: 1,
    gap: 1,
  },
  stackName: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 13,
    color: Colors.ink,
  },
  stackTake: {
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.ink2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 14,
  },
  scoreChip: {
    backgroundColor: Colors.marigoldSoft,
    borderRadius: Radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  scoreChipText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: Colors.marigoldDeep,
  },
  tagPill: {
    backgroundColor: Colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    borderRadius: Radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.ink2,
  },
  footer: {
    marginTop: 20,
    gap: 10,
  },
  primaryCta: {
    backgroundColor: Colors.oxblood,
    borderRadius: Radii.button,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryCtaDisabled: {
    opacity: 0.4,
  },
  primaryCtaText: {
    fontFamily: Fonts.sansSemiBold,
    color: '#fff',
    fontSize: 15,
  },
  loopRow: {
    flexDirection: 'row',
    gap: 8,
  },
  loopBtn: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderStrong,
    borderRadius: Radii.button,
    paddingVertical: 12,
    alignItems: 'center',
  },
  loopBtnActive: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  loopBtnText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.ink,
  },
  loopBtnTextActive: {
    color: Colors.white,
  },
  triedPanel: {
    backgroundColor: Colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    borderRadius: Radii.lg,
    padding: 12,
    gap: 8,
  },
  triedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  triedLabel: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.ink3,
  },
  lovedToggle: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.ink2,
  },
  lovedToggleActive: {
    color: Colors.oxblood,
  },
  triedInput: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.ink,
    minHeight: 40,
    padding: 0,
  },
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  deleteText: {
    fontFamily: Fonts.sansMedium,
    color: Colors.oxblood,
    fontSize: 14,
  },
  compose: {
    gap: 12,
    paddingTop: 8,
  },
  composeTitle: {
    fontFamily: Fonts.display,
    fontSize: 21,
    color: Colors.ink,
  },
  composeHint: {
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.ink2,
  },
  composeInput: {
    backgroundColor: Colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    borderRadius: Radii.input,
    padding: 14,
    minHeight: 96,
    fontFamily: Fonts.note,
    fontSize: 16,
    lineHeight: 23,
    color: Colors.ink,
  },
  composeSecondary: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  composeSecondaryText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13.5,
    color: Colors.ink2,
  },
  composeCancel: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  composeCancelText: {
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    color: Colors.ink3,
  },
});
