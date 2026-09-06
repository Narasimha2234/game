import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import { useGameStore } from '../store/gameStore';

export type TabType = 'game' | 'history' | 'profile';

interface BottomTabBarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

const TABS: Array<{ id: TabType; label: string; icon: string }> = [
  { id: 'game', label: 'GAME', icon: '🎲' },
  { id: 'history', label: 'HISTORY', icon: '📊' },
  { id: 'profile', label: 'PROFILE', icon: '👤' },
];

const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onSelectTab }) => {
  const { hapticEnabled } = useGameStore();

  const handleTabPress = (tab: TabType) => {
    if (activeTab === tab) return;
    if (hapticEnabled && Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    onSelectTab(tab);
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => handleTabPress(tab.id)}
              activeOpacity={0.7}
            >
              {isActive && (
                <LinearGradient
                  colors={['rgba(124,58,237,0.35)', 'rgba(56,189,248,0.2)']}
                  style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                />
              )}
              <Text style={[styles.icon, isActive && styles.iconActive]}>
                {tab.icon}
              </Text>
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
              {isActive && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#070915',
    borderTopWidth: 1,
    borderTopColor: 'rgba(124,58,237,0.25)',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(17,24,39,0.7)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  icon: {
    fontSize: 20,
    marginBottom: 2,
    opacity: 0.5,
  },
  iconActive: {
    opacity: 1.0,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    fontWeight: '600',
    letterSpacing: 1,
  },
  labelActive: {
    color: Colors.accentLight,
  },
  activeDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
});

export default BottomTabBar;
