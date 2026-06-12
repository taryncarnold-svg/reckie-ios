import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
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
import { ActivityIndicator, Alert, Dimensions, Linking, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { PressableScale } from '@/components/pressable-scale';
import { CategoryTints, Colors, Fonts, Radii } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { aspectRatioForCategory, CATEGORY_EMOJI, isLocationCategory } from '@/lib/categories';
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
  onChanged?: () => void;
};

const POSTER_WIDTH = 210;
const SCREEN_WIDTH = Dimensions.get('window').width;

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
    watch: rec.metadata?.type === 'series' ? 'Show' : 'Movie',
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
  if (rec.city && !parts.length) parts.push(rec.city);
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

function formatCosignLine(cosigns: CosignWithProfile[]): string | null {
  const names = cosigns.map((c) => displayName(c.profile)).slice(0, 3);
  if (names.length === 0) return null;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names[0]}, ${names[1]} & ${names[2]}`;
}

function NavButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale style={styles.navBtn} haptic="selection" onPress={onPress}>
      <Text style={styles.navBtnText}>{label}</Text>
    </PressableScale>
  );
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
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} />
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
      notifyDataChanged();
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
  const isPlace = rec ? isLocationCategory(rec.category) : false;
  const aspectRatio = rec ? aspectRatioForCategory(rec.category) : 2 / 3;
  const posterWidth = isPlace ? SCREEN_WIDTH - 40 : POSTER_WIDTH;
  const posterHeight = posterWidth / aspectRatio;
  const heroHeight = isPlace ? posterHeight + 72 : 400;
  const score = rec ? externalScore(rec) : null;
  const context = rec ? contextLine(rec) : null;
  const otherCosigns = cosigns.filter((c) => c.user_id !== rec?.user_id);
  const alreadyCosigned = !!userId && cosigns.some((c) => c.user_id === userId);
  const cosignLine = formatCosignLine(otherCosigns);
  const tagList = rec ? [...(rec.tags ?? []), ...(score ? [score] : [])] : [];

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
        handleIndicatorStyle={styles.handleHidden}>
        <BottomSheetScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}>
          {rec && !composing && (
            <>
              {/* Hero: blurred backdrop for media; full-width 4:3 for places */}
              <View style={[styles.heroZone, { height: heroHeight }]}>
                {imageUrl && !isPlace ? (
                  <>
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.heroBackdrop}
                      contentFit="cover"
                      blurRadius={28}
                      transition={200}
                    />
                    <View style={styles.heroBackdropDim} />
                  </>
                ) : imageUrl && isPlace ? (
                  <View style={styles.placeHeroBg} />
                ) : (
                  <LinearGradient
                    colors={[CategoryTints[rec.category], '#36493D']}
                    start={{ x: 0.2, y: 0 }}
                    end={{ x: 0.8, y: 1 }}
                    style={styles.heroBackdrop}
                  />
                )}

                <View style={styles.navRow}>
                  <NavButton label="‹" onPress={() => sheetRef.current?.dismiss()} />
                  <NavButton
                    label="⋯"
                    onPress={() => {
                      if (isOwner) confirmDelete();
                      else setStackExpanded(!stackExpanded);
                    }}
                  />
                </View>

                <View style={[styles.posterWrap, isPlace && styles.posterWrapPlace]}>
                  <View style={[styles.poster, { width: posterWidth, aspectRatio }]}>
                    {imageUrl ? (
                      <Image
                        source={{ uri: imageUrl }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        transition={180}
                      />
                    ) : (
                      <LinearGradient
                        colors={[CategoryTints[rec.category], '#4E6657']}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    <View style={styles.catChip}>
                      <Text style={styles.catChipText}>
                        {CATEGORY_EMOJI[rec.category]} {categoryLabel(rec)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Paper sheet — content rises over the backdrop */}
              <View style={styles.bodySheet}>
                <Text style={styles.title}>{rec.title}</Text>
                {context ? <Text style={styles.meta}>{context}</Text> : null}

                {tagList.length > 0 && (
                  <View style={styles.tags}>
                    {tagList.map((tag) => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.byline}>
                  <Avatar profile={owner} size={38} />
                  <View style={styles.bylineText}>
                    <Text style={styles.byEyebrow}>Reckied by</Text>
                    <Text style={styles.byName}>{isOwner ? 'You' : displayName(owner)}</Text>
                  </View>
                  {otherCosigns.length > 0 && (
                    <View style={styles.alsoFaces}>
                      {otherCosigns.slice(0, 2).map((cosign, index) => (
                        <View
                          key={cosign.id}
                          style={[styles.alsoFace, index > 0 && { marginLeft: -9 }]}>
                          <Avatar profile={cosign.profile} size={30} />
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {rec.note ? <Text style={styles.note}>{rec.note.trim()}</Text> : null}

                {originatorName ? (
                  <Text style={styles.lineage}>originally {originatorName}’s find</Text>
                ) : null}

                {cosignLine ? (
                  <Text style={styles.alsoLine}>
                    <Text style={styles.alsoLineBold}>{cosignLine}</Text> also reckied this
                  </Text>
                ) : null}

                {stackExpanded && otherCosigns.length > 0 && (
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

                <View style={styles.acts}>
                  {!isOwner && (
                    <>
                      <PressableScale
                        style={[styles.savePrimary, saved && styles.savePrimaryOn]}
                        haptic="medium"
                        onPress={toggleSave}
                        disabled={busy}>
                        <Text style={styles.savePrimaryText}>
                          {saved ? '✦ Saved' : '✦ Save for later'}
                        </Text>
                      </PressableScale>

                      <View style={rec.primary_action_url ? styles.secRow : undefined}>
                        {rec.primary_action_url ? (
                          <PressableScale
                            style={styles.secBtn}
                            haptic="light"
                            onPress={() => Linking.openURL(rec.primary_action_url!)}>
                            <Text style={styles.secBtnText} numberOfLines={1}>
                              ▶ {rec.primary_action_label ?? 'Open'}
                            </Text>
                          </PressableScale>
                        ) : null}
                        <PressableScale
                          style={[
                            styles.secBtn,
                            styles.reckieBtn,
                            !rec.primary_action_url && { flex: undefined, width: '100%' },
                            alreadyCosigned && styles.reckieBtnOn,
                          ]}
                          haptic="light"
                          onPress={() => {
                            if (!alreadyCosigned) setComposing(true);
                          }}
                          disabled={busy || alreadyCosigned}>
                          <Text style={[styles.reckieBtnText, alreadyCosigned && styles.reckieBtnTextOn]}>
                            {alreadyCosigned ? 'Reckied ✓' : '↗ Reckie it'}
                          </Text>
                        </PressableScale>
                      </View>

                      <PressableScale style={styles.triedLink} haptic="selection" onPress={toggleTried} disabled={busy}>
                        <Text style={[styles.triedLinkText, !!tried && styles.triedLinkTextOn]}>
                          {tried ? '✓ I tried this' : 'Mark as tried'}
                        </Text>
                      </PressableScale>
                    </>
                  )}

                  {isOwner && rec.primary_action_url && (
                    <PressableScale
                      style={styles.savePrimary}
                      haptic="medium"
                      onPress={() => Linking.openURL(rec.primary_action_url!)}>
                      <Text style={styles.savePrimaryText}>▶ {rec.primary_action_label ?? 'Open'}</Text>
                    </PressableScale>
                  )}

                  {isOwner && (
                    <PressableScale style={styles.deleteBtn} haptic="light" onPress={confirmDelete}>
                      <Text style={styles.deleteText}>Delete</Text>
                    </PressableScale>
                  )}
                </View>

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
              </View>
            </>
          )}

          {rec && composing && (
            <View style={[styles.compose, { paddingBottom: insets.bottom }]}>
              <Text style={styles.composeTitle}>Reckie {rec.title}</Text>
              <Text style={styles.composeHint}>
                Your take — like a text to a friend. It joins {isOwner ? 'the' : `${displayName(owner)}’s`}{' '}
                vouch stack and lands on your shelf.
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
                style={[styles.savePrimary, !take.trim() && styles.savePrimaryDisabled]}
                haptic="medium"
                onPress={submitPassOn}
                disabled={busy || !take.trim()}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.savePrimaryText}>Reckie it</Text>}
              </PressableScale>
              <PressableScale style={styles.composeSecondary} haptic="selection" onPress={submitCosignOnly} disabled={busy}>
                <Text style={styles.composeSecondaryText}>Just vouch, don’t add to my shelf</Text>
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
    backgroundColor: Colors.paper,
    borderTopLeftRadius: Radii.sheet,
    borderTopRightRadius: Radii.sheet,
  },
  handleHidden: {
    opacity: 0,
    height: 4,
  },
  heroZone: {
    position: 'relative',
    overflow: 'hidden',
  },
  placeHeroBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#2A332E',
  },
  heroBackdrop: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ scale: 1.15 }],
  },
  heroBackdropDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  navRow: {
    position: 'absolute',
    top: 8,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 5,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  navBtnText: {
    fontSize: 18,
    color: Colors.ink,
    lineHeight: 20,
  },
  posterWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 22,
    zIndex: 2,
  },
  posterWrapPlace: {
    justifyContent: 'center',
    paddingBottom: 16,
  },
  poster: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  catChip: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: Radii.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  catChipText: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#fff',
  },
  bodySheet: {
    backgroundColor: Colors.paper,
    borderTopLeftRadius: Radii.sheet,
    borderTopRightRadius: Radii.sheet,
    marginTop: -12,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 8,
  },
  title: {
    fontFamily: Fonts.displayMedium,
    fontSize: 30,
    letterSpacing: -0.6,
    lineHeight: 31,
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  meta: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.ink3,
    textAlign: 'center',
    marginBottom: 18,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 22,
  },
  tag: {
    backgroundColor: Colors.tagBg,
    borderRadius: Radii.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  tagText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: Colors.ink2,
  },
  byline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 14,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEEAE1',
  },
  bylineText: {
    flex: 1,
    gap: 1,
  },
  byEyebrow: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 0.55,
    textTransform: 'uppercase',
    color: Colors.ink3,
  },
  byName: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 15,
    color: Colors.ink,
  },
  alsoFaces: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alsoFace: {
    borderWidth: 2,
    borderColor: Colors.paper,
    borderRadius: 16,
  },
  note: {
    fontFamily: Fonts.sans,
    fontSize: 16.5,
    lineHeight: 25,
    color: Colors.noteText,
    marginBottom: 8,
  },
  lineage: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.ink3,
    marginBottom: 8,
  },
  alsoLine: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.ink3,
    marginBottom: 22,
  },
  alsoLineBold: {
    fontFamily: Fonts.sansSemiBold,
    color: Colors.ink2,
  },
  stack: {
    marginBottom: 18,
    backgroundColor: Colors.paper2,
    borderRadius: Radii.lg,
    padding: 14,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
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
  acts: {
    gap: 9,
  },
  savePrimary: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: Radii.button,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  savePrimaryOn: {
    backgroundColor: Colors.ink2,
  },
  savePrimaryDisabled: {
    opacity: 0.4,
  },
  savePrimaryText: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 15,
    color: '#fff',
  },
  secRow: {
    flexDirection: 'row',
    gap: 9,
  },
  secBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radii.button,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.buttonBorder,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  secBtnText: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 14,
    color: Colors.ink,
  },
  reckieBtn: {
    backgroundColor: Colors.oxbloodSoft,
    borderColor: Colors.oxbloodLine,
  },
  reckieBtnOn: {
    backgroundColor: Colors.paper,
    borderColor: Colors.line,
  },
  reckieBtnText: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 14,
    color: Colors.oxblood,
  },
  reckieBtnTextOn: {
    color: Colors.ink2,
  },
  triedLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  triedLinkText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.ink3,
  },
  triedLinkTextOn: {
    color: Colors.ink2,
  },
  triedPanel: {
    marginTop: 16,
    backgroundColor: Colors.white,
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
    fontFamily: Fonts.sansBold,
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
    paddingVertical: 12,
  },
  deleteText: {
    fontFamily: Fonts.sansMedium,
    color: Colors.oxblood,
    fontSize: 14,
  },
  compose: {
    paddingHorizontal: 22,
    paddingTop: 12,
    gap: 12,
  },
  composeTitle: {
    fontFamily: Fonts.displayMedium,
    fontSize: 24,
    color: Colors.ink,
  },
  composeHint: {
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.ink2,
  },
  composeInput: {
    backgroundColor: Colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    borderRadius: Radii.input,
    padding: 14,
    minHeight: 96,
    fontFamily: Fonts.sans,
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
