import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { AddReckieSheet, type AddReckieSheetRef } from '@/components/add-reckie-sheet';
import { Colors, Fonts } from '@/constants/theme';

/** Five slots: Home · Circle · ＋ · Saved · Reach. Search/map are hidden routes. */
export default function TabLayout() {
  const addSheetRef = useRef<AddReckieSheetRef>(null);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.ink,
          tabBarInactiveTintColor: Colors.ink3,
          tabBarLabelStyle: {
            fontFamily: Fonts.sansMedium,
            fontSize: 10,
          },
          tabBarStyle: {
            position: 'absolute',
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: Colors.line,
            backgroundColor: 'transparent',
            elevation: 0,
          },
          tabBarBackground: () => (
            <BlurView tint="systemChromeMaterialLight" intensity={85} style={StyleSheet.absoluteFill} />
          ),
        }}
        screenListeners={{
          tabPress: () => {
            Haptics.selectionAsync();
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <SymbolView name={focused ? 'house.fill' : 'house'} size={24} tintColor={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="circle"
          options={{
            title: 'Circle',
            tabBarIcon: ({ color, focused }) => (
              <SymbolView name={focused ? 'person.2.fill' : 'person.2'} size={24} tintColor={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: '',
            tabBarIcon: () => (
              <View style={styles.fab}>
                <SymbolView name="plus" size={20} tintColor="#fff" weight="semibold" />
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              addSheetRef.current?.present();
            },
          }}
        />
        <Tabs.Screen
          name="saved"
          options={{
            title: 'Saved',
            tabBarIcon: ({ color, focused }) => (
              <SymbolView name={focused ? 'bookmark.fill' : 'bookmark'} size={22} tintColor={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="reach"
          options={{
            title: 'Reach',
            tabBarIcon: ({ color, focused }) => (
              <SymbolView name={focused ? 'map.fill' : 'map'} size={22} tintColor={color} />
            ),
          }}
        />
        <Tabs.Screen name="search" options={{ href: null }} />
        <Tabs.Screen name="map" options={{ href: null }} />
      </Tabs>
      <AddReckieSheet ref={addSheetRef} />
    </>
  );
}

const styles = StyleSheet.create({
  // The oxblood FAB — the one place with a soft shadow (DESIGN.md §5).
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.oxblood,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    shadowColor: Colors.oxbloodDeep,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
});
