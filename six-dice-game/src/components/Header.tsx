import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../constants/colors';

const Header: React.FC = () => {
  const { soundEnabled, hapticEnabled, toggleSound } = useGameStore();
  const { walletBalance, refreshWallet } = useAuthStore();

  const handleToggleSound = () => {
    if (hapticEnabled && Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    toggleSound();
  };

  const handleTapBalance = () => {
    if (hapticEnabled && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    refreshWallet();
  };

  return (
    <View style={styles.container}>
      {/* Left: Brand Logo & Title */}
      <View style={styles.brandBlock}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeIcon}>🎲</Text>
        </View>
        <View style={styles.titleColumn}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>HEX</Text>
            <Text style={styles.titleAccent}>ROLL 3D</Text>
          </View>
          <Text style={styles.subtitle}>CASUAL RELIEF GAME</Text>
        </View>
      </View>

      {/* Right: Coin Balance Chip & Sound Toggle */}
      <View style={styles.rightSection}>
        {/* Coin Balance Chip */}
        <TouchableOpacity
          style={styles.balanceChip}
          onPress={handleTapBalance}
          activeOpacity={0.8}
        >
          <Text style={styles.coinIcon}>🪙</Text>
          <Text style={styles.balanceText}>
            {Number(walletBalance).toLocaleString('en-IN')}
          </Text>
          <View style={styles.plusBtn}>
            <Text style={styles.plusText}>₹</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(124,58,237,0.25)',
    borderWidth: 1.5,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 6,
  },
  logoBadgeIcon: {
    fontSize: 20,
  },
  titleColumn: {
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
    letterSpacing: 1,
  },
  titleAccent: {
    color: '#38bdf8',
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
    letterSpacing: 1,
    marginLeft: 4,
  },
  subtitle: {
    color: 'rgba(148,163,184,0.7)',
    fontSize: 9,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17,24,39,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.35)',
    borderRadius: 20,
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 3,
    gap: 6,
  },
  coinIcon: {
    fontSize: 14,
  },
  balanceText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
  },
  plusBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Outfit_700Bold',
    lineHeight: 16,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(17,24,39,0.7)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnOff: {
    opacity: 0.5,
  },
  soundIconText: {
    fontSize: 14,
  },
});

export default Header;
