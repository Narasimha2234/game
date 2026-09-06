import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { useGameStore } from '../store/gameStore';

// Face images (replace with transparent PNGs if you want alpha backgrounds)
const FACE_MODULES = [
  require('../../assets/dice-faces/png/bat.png'),
  require('../../assets/dice-faces/png/dimond.png'),
  require('../../assets/dice-faces/png/heart.png'),
  require('../../assets/dice-faces/png/leaf.png'),
  require('../../assets/dice-faces/png/tree.png'),
  require('../../assets/dice-faces/png/WhatsApp Image 2026-09-05 at 12.09.12.png'),
];
const BET_INCREMENTS = [10, 50, 100, 500];

const BettingControlPanel: React.FC = () => {
  const { hapticEnabled, selectedNumber, setSelectedNumber } = useGameStore();
  const [betAmount, setBetAmount] = useState<number>(1000);

  const triggerHaptic = () => {
    if (hapticEnabled && Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  };

  const handleSelectNumber = (num: number) => {
    triggerHaptic();
    setSelectedNumber(num);
  };

  const handleAdjustBet = (delta: number) => {
    triggerHaptic();
    setBetAmount((prev) => Math.max(10, prev + delta));
  };

  const handleAddPreset = (amount: number) => {
    triggerHaptic();
    setBetAmount((prev) => prev + amount);
  };

  const handleMaxBet = () => {
    triggerHaptic();
    setBetAmount(5000);
  };

  return (
    <View style={styles.container}>

      {/* 2. Number Selector Section */}
      <View style={styles.selectorHeader}>
        <Text style={styles.selectorTitle}>PICK A FACE</Text>
        <Text style={styles.selectorSubtitle}>CHOOSE YOUR LUCKY FACE</Text>
      </View>

      <View style={styles.numberGrid}>
        {FACE_MODULES.map((mod, idx) => {
          const num = idx + 1;
          const isSelected = selectedNumber === num;
          return (
            <TouchableOpacity
              key={num}
              style={styles.numberCard}
              onPress={() => handleSelectNumber(num)}
              activeOpacity={0.85}
            >
              <View style={[styles.cardInner, isSelected && styles.selectedInner]}>
                {isSelected ? (
                  <View style={styles.imageWrap} pointerEvents="none">
                    <Image source={mod} style={[styles.faceImage, styles.glowImage]} blurRadius={8} />
                    <Image source={mod} style={styles.faceImage} />
                  </View>
                ) : (
                  <Image source={mod} style={styles.faceImage} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 3. Bet Control & Multiplier Row */}
      <View style={styles.betSection}>
        <View style={styles.betRow}>
          {/* Bigger Minus Button */}
          <TouchableOpacity
            style={styles.adjustBtn}
            onPress={() => handleAdjustBet(-50)}
            activeOpacity={0.8}
          >
            <Text style={styles.adjustBtnText}>−</Text>
          </TouchableOpacity>

          {/* Larger Amount Display Box */}
          <View style={styles.amountBox}>
            <Text style={styles.coinIcon}>🪙</Text>
            <Text style={styles.amountText}>{betAmount}</Text>
          </View>

          {/* Bigger Plus Button */}
          <TouchableOpacity
            style={styles.adjustBtn}
            onPress={() => handleAdjustBet(50)}
            activeOpacity={0.8}
          >
            <Text style={styles.adjustBtnText}>+</Text>
          </TouchableOpacity>

          {/* Quick Increment Pills */}
          <View style={styles.incrementList}>
            {BET_INCREMENTS.map((amt) => (
              <TouchableOpacity
                key={amt}
                style={styles.incPill}
                onPress={() => handleAddPreset(amt)}
                activeOpacity={0.8}
              >
                <Text style={styles.incPillText}>+{amt}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.incPill, styles.incPillMax]}
              onPress={handleMaxBet}
              activeOpacity={0.8}
            >
              <Text style={[styles.incPillText, styles.incPillMaxText]}>
                MAX
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 2,
    gap: 10,
  },
  matchesBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(11,15,30,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  matchesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchesIcon: {
    color: '#38bdf8',
    fontSize: 10,
  },
  matchesTitle: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  matchesRight: {},
  matchesLink: {
    color: 'rgba(148,163,184,0.8)',
    fontSize: 10,
    fontFamily: 'Outfit_500Medium',
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 1,
  },
  selectorTitle: {
    color: '#38bdf8',
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  selectorSubtitle: {
    color: Colors.accentLight,
    fontSize: 8,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.5,
  },
  numberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  numberCard: {
    width: '31%',
    height: 64,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 0,
    overflow: 'visible',
  },
  numberCardSelectedBorder: {
    borderColor: '#38bdf8',
    borderWidth: 1.5,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  cardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  numberText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
  },
  numberTextSelected: {
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  checkBadge: {
    position: 'absolute',
    top: 3,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#000000',
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
  },
  neonGlowBar: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: '#38bdf8',
  },
  faceImage: {
    width: 52,
    height: 52,
    backgroundColor: 'transparent',
  },
  selectedInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowImage: {
    position: 'absolute',
    width: 62,
    height: 62,
    transform: [{ scale: 1.2 }],
    tintColor: '#38bdf8',
    opacity: 0.95,
  },
  betSection: {
    marginTop: 14,
  },
  betRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  adjustBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(30,27,75,0.9)',
    borderWidth: 1.5,
    borderColor: 'rgba(124,58,237,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  adjustBtnText: {
    color: '#ffffff',
    fontSize: 20,
    fontFamily: 'Outfit_700Bold',
    lineHeight: 22,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11,15,30,0.95)',
    borderWidth: 1.5,
    borderColor: 'rgba(124,58,237,0.5)',
    borderRadius: 10,
    paddingHorizontal: 8,
    height: 36,
    gap: 4,
  },
  coinIcon: {
    fontSize: 13,
  },
  amountText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
  },
  incrementList: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 3,
  },
  incPill: {
    backgroundColor: 'rgba(17,24,39,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    height: 32,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  incPillText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
  },
  incPillMax: {
    backgroundColor: 'rgba(236,72,153,0.25)',
    borderColor: '#ec4899',
  },
  incPillMaxText: {
    color: '#f472b6',
    fontFamily: 'Outfit_700Bold',
  },
});

export default BettingControlPanel;
