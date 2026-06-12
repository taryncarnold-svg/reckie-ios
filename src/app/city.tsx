import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlurHeader, useHeaderHeight } from '@/components/blur-header';
import { PressableScale } from '@/components/pressable-scale';
import { ReckieCard } from '@/components/reckie-card';
import { useReckieDetail } from '@/components/reckie-detail-sheet';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { CategoryTints, Colors, Fonts } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Category, Rec } from '@/lib/types';

/** City guide (PRODUCT.md §5): Eat / Drink / Do within one city, with a Map view. */

const CITY_SHELVES: { category: Category; title: string }[] = [
  { category: 'eat', title: 'Restaurants' },
  { category: 'drink', title: 'Bars' },
  { category: 'do', title: 'Things to do' },
];

type Pin = { rec: Rec; latitude: number; longitude: number };

export default function CityScreen() {
  const { userId, city, ownerName } = useLocalSearchParams<{
    userId: string;
    city: string;
    ownerName?: string;
  }>();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { openReckie } = useReckieDetail();
  const { width: screenWidth } = useWindowDimensions();

  const [recs, setRecs] = useState<Rec[]>([]);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [pins, setPins] = useState<Pin[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const geocodedFor = useRef<string | null>(null);
  const mapRef = useRef<MapView>(null);

  const isOwn = userId === session?.user.id;
  const cardWidth = (screenWidth - 40 - 24) / 3;

  const load = useCallback(async () => {
    if (!userId || !city) return;
    const { data } = await supabase
      .from('recs')
      .select('*')
      .eq('user_id', userId)
      .ilike('city', city)
      .order('created_at', { ascending: false });
    setRecs((data ?? []) as Rec[]);
  }, [userId, city]);

  useEffect(() => {
    load();
  }, [load]);

  // Places have no stored coordinates, so pins are best-effort: geocode
  // "title, city" with the native geocoder the first time Map is opened.
  useEffect(() => {
    if (view !== 'map' || recs.length === 0) return;
    const key = recs.map((r) => r.id).join(',');
    if (geocodedFor.current === key) return;
    geocodedFor.current = key;

    let cancelled = false;
    (async () => {
      setGeocoding(true);
      const found: Pin[] = [];
      for (const rec of recs) {
        try {
          const results = await Location.geocodeAsync(`${rec.title}, ${rec.city ?? city}`);
          if (results[0]) {
            found.push({ rec, latitude: results[0].latitude, longitude: results[0].longitude });
          }
        } catch {
          // skip places the geocoder can't find
        }
        if (cancelled) return;
      }
      if (!cancelled) {
        setPins(found);
        setGeocoding(false);
        if (found.length > 0) {
          requestAnimationFrame(() => {
            mapRef.current?.fitToCoordinates(
              found.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
              { edgePadding: { top: 90, bottom: 60, left: 60, right: 60 }, animated: false }
            );
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view, recs, city]);

  return (
    <View style={styles.screen}>
      {view === 'list' ? (
        <ScrollView
          contentContainerStyle={{
            paddingTop: headerHeight + 20,
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 20,
          }}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>{city?.toUpperCase()}</Text>
          <Text style={styles.heading}>{isOwn ? 'Your guide' : `${ownerName ?? 'Their'}’s guide`}</Text>

          <View style={styles.toggle}>
            <SegmentedTabs
              options={[
                { id: 'list', label: 'List' },
                { id: 'map', label: 'Map' },
              ]}
              value={view}
              onChange={setView}
            />
          </View>

          {CITY_SHELVES.map((shelf) => {
            const shelfRecs = recs.filter((rec) => rec.category === shelf.category);
            if (shelfRecs.length === 0) return null;
            return (
              <View key={shelf.category} style={styles.section}>
                <Text style={styles.sectionTitle}>{shelf.title.toUpperCase()}</Text>
                <View style={styles.grid}>
                  {shelfRecs.map((rec) => (
                    <ReckieCard
                      key={rec.id}
                      rec={rec}
                      width={cardWidth}
                      onPress={() => openReckie({ rec, onChanged: load })}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View style={StyleSheet.absoluteFill}>
          <MapView ref={mapRef} style={StyleSheet.absoluteFill}>
            {pins.map((pin) => (
              <Marker
                key={pin.rec.id}
                coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
                title={pin.rec.title}
                pinColor={CategoryTints[pin.rec.category] ?? Colors.oxblood}
                onCalloutPress={() => openReckie({ rec: pin.rec, onChanged: load })}
              />
            ))}
          </MapView>
          <View style={[styles.mapToggle, { top: headerHeight + 12 }]}>
            <SegmentedTabs
              options={[
                { id: 'list', label: 'List' },
                { id: 'map', label: 'Map' },
              ]}
              value={view}
              onChange={setView}
            />
          </View>
          {geocoding && (
            <View style={[styles.mapStatus, { bottom: insets.bottom + 20 }]}>
              <ActivityIndicator size="small" color={Colors.ink2} />
              <Text style={styles.mapStatusText}>Placing pins…</Text>
            </View>
          )}
          {!geocoding && pins.length === 0 && (
            <View style={[styles.mapStatus, { bottom: insets.bottom + 20 }]}>
              <Text style={styles.mapStatusText}>Couldn’t place these on the map yet.</Text>
            </View>
          )}
        </View>
      )}
      <BlurHeader title={city ?? 'City'} />
      <PressableScale
        style={[styles.backBtn, { top: insets.top + 7 }]}
        haptic="selection"
        onPress={() => router.back()}>
        <SymbolView name="chevron.left" size={17} tintColor={Colors.ink} weight="semibold" />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  eyebrow: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 11.5,
    letterSpacing: 1.5,
    color: Colors.ink3,
  },
  heading: {
    marginTop: 4,
    marginBottom: 16,
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.ink,
  },
  toggle: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 12.5,
    letterSpacing: 1.1,
    color: Colors.ink,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mapToggle: {
    position: 'absolute',
    alignSelf: 'center',
  },
  mapStatus: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
  },
  mapStatusText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12.5,
    color: Colors.ink2,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
