import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  Image,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';

// Face images
const FACE_MODULES = [
  require('../../assets/dice-faces/png/bat.png'),
  require('../../assets/dice-faces/png/dimond.png'),
  require('../../assets/dice-faces/png/heart.png'),
  require('../../assets/dice-faces/png/leaf.png'),
  require('../../assets/dice-faces/png/tree.png'),
  require('../../assets/dice-faces/png/WhatsApp Image 2026-09-05 at 12.09.12.png'),
];

const FACE_NAMES = ['BAT', 'DIAMOND', 'HEART', 'LEAF', 'TREE', 'CROWN'];
const PRESET_AMOUNTS = [10, 50, 100, 500, 1000];

const BettingControlPanel: React.FC = () => {
  const {
    hapticEnabled,
    selectedNumber,
    setSelectedNumber,
    betAmount,
    setBetAmount,
    myBets,
    serverPhase,
  } = useGameStore();

  const { walletBalance } = useAuthStore();
  const inputRef = useRef<TextInput>(null);

  const [inputVal, setInputVal] = useState<string>(betAmount.toString());
  const [isFocused, setIsFocused] = useState<boolean>(false);

  // Sync input string when betAmount changes externally (only when not actively typing)
  useEffect(() => {
    if (!isFocused) {
      setInputVal(betAmount > 0 ? betAmount.toString() : '1');
    }
  }, [betAmount, isFocused]);

  const isBettingOpen = serverPhase === 'BETTING_OPEN';

  const triggerHaptic = () => {
    if (hapticEnabled && Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  };

  const handleSelectNumber = (num: number) => {
    triggerHaptic();
    setSelectedNumber(num);
  };

  const handleSetPreset = (amount: number) => {
    triggerHaptic();
    setBetAmount(amount);
    setInputVal(amount.toString());
    inputRef.current?.blur();
  };

  const handleMaxBet = () => {
    triggerHaptic();
    const maxAmount = walletBalance > 0 ? walletBalance : 1;
    setBetAmount(maxAmount);
    setInputVal(maxAmount.toString());
    inputRef.current?.blur();
  };

  const handleAdjustBet = (delta: number) => {
    triggerHaptic();
    const current = parseInt(inputVal, 10) || betAmount || 1;
    const newAmt = Math.max(1, current + delta);
    setBetAmount(newAmt);
    setInputVal(newAmt.toString());
  };

  const handleInputChange = (text: string) => {
    // Only allow numeric digits
    const cleaned = text.replace(/[^0-9]/g, '');
    setInputVal(cleaned);

    if (cleaned === '') {
      return;
    }

    const parsed = parseInt(cleaned, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setBetAmount(parsed);
    }
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    const parsed = parseInt(inputVal, 10);
    if (isNaN(parsed) || parsed < 1) {
      setBetAmount(1);
      setInputVal('1');
    } else {
      setBetAmount(parsed);
      setInputVal(parsed.toString());
    }
  };

  const handleFocusInput = () => {
    inputRef.current?.focus();
  };

  // Helper to sum user's placed bets on each face for the active round
  const getUserBetOnFace = (faceNum: number) => {
    const faceBets = myBets.filter((b) => b.selectedNumber === faceNum);
    return faceBets.reduce((sum, b) => sum + b.amount, 0);
  };

  const isMaxActive = walletBalance > 0 && betAmount === walletBalance;

  return (
    <View style={styles.container}>
      {/* 1. Header Row */}
      <View style={styles.selectorHeader}>
        <Text style={styles.selectorTitle}>PICK A FACE</Text>
        <Text style={styles.selectorSubtitle}>
          {isBettingOpen ? 'CHOOSE YOUR LUCKY FACE' : 'BETTING LOCKED'}
        </Text>
      </View>

      {/* 2. 6 Dice Faces Grid (Borderless Clean Icons) */}
      <View style={styles.numberGrid}>
        {FACE_MODULES.map((mod, idx) => {
          const num = idx + 1;
          const isSelected = selectedNumber === num;
          const placedBetAmount = getUserBetOnFace(num);

          return (
            <TouchableOpacity
              key={num}
              style={styles.faceTouchable}
              onPress={() => handleSelectNumber(num)}
              activeOpacity={0.8}
            >
              <View style={styles.faceWrapper}>
                {/* Selected Glow Aura */}
                {isSelected ? (
                  <View style={styles.selectedGlowWrap} pointerEvents="none">
                    <Image source={mod} style={styles.glowImage} blurRadius={10} />
                    <Image source={mod} style={[styles.faceImage, styles.selectedFaceImage]} />
                  </View>
                ) : (
                  <Image source={mod} style={[styles.faceImage, !isBettingOpen && styles.mutedFaceImage]} />
                )}

                {/* Face Label */}
                <Text style={[styles.faceLabel, isSelected && styles.selectedFaceLabel]}>
                  {FACE_NAMES[idx]}
                </Text>

                {/* Active Selection Underline Glow */}
                {isSelected && <View style={styles.selectedIndicator} />}

                {/* Placed Bet Badge */}
                {placedBetAmount > 0 && (
                  <View style={styles.placedBetBadge}>
                    <Text style={styles.placedBetText}>₹{placedBetAmount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 3. Custom Bet Amount Input & Presets Section */}
      <View style={styles.betSection}>
        {/* Row 1: Amount Input Box with - / + Steppers */}
        <View style={styles.inputRow}>
          <TouchableOpacity
            style={styles.adjustBtn}
            onPress={() => handleAdjustBet(-10)}
            activeOpacity={0.8}
          >
            <Text style={styles.adjustBtnText}>−</Text>
          </TouchableOpacity>

          <Pressable
            style={[styles.inputBox, isFocused && styles.inputBoxFocused]}
            onPress={handleFocusInput}
          >
            <Text style={styles.currencyPrefix}>₹</Text>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={inputVal}
              onChangeText={handleInputChange}
              onFocus={() => setIsFocused(true)}
              onBlur={handleInputBlur}
              onSubmitEditing={handleInputBlur}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor="#64748b"
              maxLength={8}
              selectTextOnFocus
              returnKeyType="done"
            />
          </Pressable>

          <TouchableOpacity
            style={styles.adjustBtn}
            onPress={() => handleAdjustBet(10)}
            activeOpacity={0.8}
          >
            <Text style={styles.adjustBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Row 2: Preset Chips & MAX Option */}
        <View style={styles.presetsRow}>
          {PRESET_AMOUNTS.map((amt) => {
            const isSelected = betAmount === amt;
            return (
              <TouchableOpacity
                key={amt}
                style={[styles.presetChip, isSelected && styles.presetChipActive]}
                onPress={() => handleSetPreset(amt)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    isSelected && styles.presetChipTextActive,
                  ]}
                >
                  ₹{amt}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* MAX Total Wallet Amount Preset */}
          <TouchableOpacity
            style={[styles.presetChip, styles.presetMaxChip, isMaxActive && styles.presetMaxChipActive]}
            onPress={handleMaxBet}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.presetMaxText,
                isMaxActive && styles.presetMaxTextActive,
              ]}
            >
              MAX
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 2,
    gap: 6,
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
    gap: 4,
    justifyContent: 'space-between',
  },
  faceTouchable: {
    width: '31%',
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  faceWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  faceImage: {
    width: 44,
    height: 44,
    backgroundColor: 'transparent',
    resizeMode: 'contain',
  },
  selectedFaceImage: {
    transform: [{ scale: 1.1 }],
  },
  mutedFaceImage: {
    opacity: 0.75,
  },
  selectedGlowWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowImage: {
    position: 'absolute',
    width: 50,
    height: 50,
    transform: [{ scale: 1.25 }],
    tintColor: '#38bdf8',
    opacity: 0.9,
  },
  faceLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 8,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  selectedFaceLabel: {
    color: '#38bdf8',
    fontFamily: 'Outfit_700Bold',
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: -1,
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#38bdf8',
  },
  placedBetBadge: {
    position: 'absolute',
    top: -2,
    right: 6,
    backgroundColor: '#22c55e',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 4,
  },
  placedBetText: {
    color: '#000000',
    fontSize: 8,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '800',
  },
  betSection: {
    marginTop: 4,
    gap: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11,15,30,0.95)',
    borderWidth: 1.5,
    borderColor: 'rgba(124,58,237,0.6)',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
    gap: 4,
  },
  inputBoxFocused: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(15,23,42,0.98)',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  currencyPrefix: {
    color: '#38bdf8',
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '800',
  },
  textInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
    paddingVertical: 0,
    height: '100%',
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  presetChip: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipActive: {
    backgroundColor: 'rgba(56,189,248,0.22)',
    borderColor: '#38bdf8',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  presetChipText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  presetChipTextActive: {
    color: '#38bdf8',
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
  },
  presetMaxChip: {
    backgroundColor: 'rgba(236,72,153,0.15)',
    borderColor: 'rgba(236,72,153,0.5)',
  },
  presetMaxChipActive: {
    backgroundColor: '#ec4899',
    borderColor: '#f472b6',
    shadowColor: '#ec4899',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  presetMaxText: {
    color: '#f472b6',
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '800',
  },
  presetMaxTextActive: {
    color: '#ffffff',
    fontWeight: '900',
  },
});

export default BettingControlPanel;
