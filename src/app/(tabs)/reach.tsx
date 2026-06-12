import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { BlurHeader, useHeaderHeight } from '@/components/blur-header';
import { PressableScale } from '@/components/pressable-scale';
import { useReckieDetail } from '@/components/reckie-detail-sheet';
import { Colors, Fonts } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { fetchReachSpread, type ReachCity } from '@/lib/data';
import { useDataChanged } from '@/lib/refresh';

type CityPin = ReachCity & { latitude: number; longitude: number };

/** Reach Map — where your reckies have spread (replaces Search tab). */
export default function ReachScreen() {
  const { session } = useAuth();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { openReckie } = useReckieDetail();

  const [cities, setCities] = useState<ReachCity[]>([]);
  const [totalSpread, setTotalSpread] = useState(0);
  const [seedCount, setSeedCount] = useState(0);
  const [pins, setPins] = useState<CityPin[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const mapRef = useRef<MapView>(null);
  const geocodedKey = useRef('');

  const userId = session?.user.id;

  const load = useCallback(async () => {
    if (!userId) return;
    const spread = await fetchReachSpread(userId);
    setCities(spread.cities);
    setTotalSpread(spread.totalSpread);
    setSeedCount(spread.seedCount);
    setLoaded(true);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useDataChanged(load);

  useEffect(() => {
    if (cities.length === 0) {
      setPins([]);
      return;
    }
    const key = cities.map((c) => `${c.city}:${c.count}`).join('|');
    if (geocodedKey.current === key) return;
    geocodedKey.current = key;

    let cancelled = false;
    (async () => {
      setGeocoding(true);
      const found: CityPin[] = [];
      for (const group of cities) {
        try {
          const results = await Location.geocodeAsync(group.city);
          if (results[0]) {
            found.push({ ...group, latitude: results[0].latitude, longitude: results[0].longitude });
          }
        } catch {
          // skip cities the geocoder can't resolve
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
              { edgePadding: { top: 80, bottom: 40, left: 50, right: 50 }, animated: false }
            );
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cities]);

  const empty = loaded && totalSpread === 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + 16,
          paddingBottom: tabBarHeight + 32,
        }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerPad}>
          <Text style={styles.heading}>Reach</Text>
          <Text style={styles.subtitle}>
            {empty
              ? 'When people pick up your reckies, you’ll see where they spread.'
              : `${totalSpread} ${totalSpread === 1 ? 'person' : 'people'} reckied something you started · ${seedCount} seeds`}
          </Text>
        </View>

        <View style={styles.mapWrap}>
          {geocoding && pins.length === 0 ? (
            <View style={styles.mapLoading}>
              <ActivityIndicator color={Colors.ink3} />
            </View>
          ) : (
            <MapView ref={mapRef} style={styles.map} userInterfaceStyle="light">
              {pins.map((pin) => (
                <Marker
                  key={pin.city}
                  coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
                  title={pin.city}
                  description={`${pin.count} reckie${pin.count === 1 ? '' : 's'}`}
                />
              ))}
            </MapView>
          )}
        </View>

        {cities.length > 0 && (
          <View style={styles.listPad}>
            <Text style={styles.sectionLabel}>By city</Text>
            {cities.map((group) => (
              <View key={group.city} style={styles.cityBlock}>
                <Text style={styles.cityName}>
                  {group.city} · {group.count}
                </Text>
                {group.recs.slice(0, 4).map((rec) => (
                  <PressableScale
                    key={rec.id}
                    style={styles.recRow}
                    haptic="light"
                    onPress={() => openReckie({ rec, onChanged: load })}>
                    <Text style={styles.recTitle} numberOfLines={1}>
                      {rec.title}
                    </Text>
                  </PressableScale>
                ))}
              </View>
            ))}
          </View>
        )}

        {empty && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing on the map yet</Text>
            <Text style={styles.emptyHint}>
              Share reckies and vouch for friends — when someone passes one on, it shows up here.
            </Text>
          </View>
        )}
      </ScrollView>
      <BlurHeader title="Reach" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  headerPad: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  heading: {
    fontFamily: Fonts.displayMedium,
    fontSize: 30,
    letterSpacing: -0.6,
    color: Colors.ink,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.ink3,
  },
  mapWrap: {
    marginHorizontal: 20,
    height: 240,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.lineSoft,
  },
  listPad: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionLabel: {
    fontFamily: Fonts.sansBold,
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: Colors.ink3,
    marginBottom: 10,
  },
  cityBlock: {
    marginBottom: 16,
  },
  cityName: {
    fontFamily: Fonts.displayMedium,
    fontSize: 17,
    color: Colors.ink,
    marginBottom: 6,
  },
  recRow: {
    paddingVertical: 6,
  },
  recTitle: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.ink2,
  },
  empty: {
    paddingVertical: 32,
    paddingHorizontal: 32,
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
