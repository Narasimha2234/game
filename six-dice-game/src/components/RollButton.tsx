import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';

const RollButton: React.FC = () => {
  const {
    phase,
    serverPhase,
    mode,
    stopMessage,
    hapticEnabled,
    placeBet,
    isPlacingBet,
    betAmount,
    selectedNumber,
  } = useGameStore();
  const { walletBalance } = useAuthStore();

  const isBettingOpen = serverPhase === 'BETTING_OPEN' && mode !== 'STOPPED';
  const isRolling = phase === 'rolling' || phase === 'landing' || serverPhase === 'ROLLING';
  const isDisabled = !isBettingOpen || isRolling || isPlacingBet;

  const handlePress = async () => {
    if (isDisabled) return;

    if (betAmount < 1) {
      Alert.alert(
        'Invalid Bet Amount',
        'Please enter a bet amount of at least ₹1 coin.',
      );
      return;
    }

    if (walletBalance < betAmount) {
      Alert.alert(
        'Insufficient Balance',
        `You need ₹${betAmount} coins to place this bet. Current balance: ₹${walletBalance}.`,
      );
      return;
    }

    if (hapticEnabled && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const success = await placeBet();
      if (success) {
        if (hapticEnabled && Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (err: any) {
      Alert.alert(
        'Bet Failed',
        err?.response?.data?.message || err?.message || 'Could not place bet.',
      );
    }
  };

  let buttonText = 'PLACE BET';
  if (isPlacingBet) buttonText = 'CONFIRMING BET...';
  else if (isRolling) buttonText = 'ROLLING...';
  else if (mode === 'STOPPED') buttonText = 'GAME PAUSED';
  else if (serverPhase !== 'BETTING_OPEN') buttonText = 'BETTING CLOSED';

  return (
    <View style={styles.wrapper}>
      <View style={styles.buttonWrap}>
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            styles.pressable,
            pressed && !isDisabled && styles.pressed,
          ]}
          disabled={isDisabled}
        >
          <LinearGradient
            colors={
              isDisabled
                ? ['#475569', '#334155', '#1e293b']
                : ['#c084fc', '#9333ea', '#6d28d9']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            {/* Top highlight line for 3D metallic sheen effect */}
            <View style={styles.topSheen} />

            <Text style={[styles.label, isDisabled && styles.labelDisabled]}>
              {buttonText}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
      {mode === 'STOPPED' && (
        <Text style={styles.stoppedSubtext} numberOfLines={1}>
          📢 {stopMessage || 'Game paused by admin'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonWrap: {
    width: '100%',
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.75,
    shadowRadius: 14,
    elevation: 8,
  },
  pressable: {
    width: '100%',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  gradient: {
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 1,
  },
  label: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 4,
  },
  labelDisabled: {
    color: 'rgba(255,255,255,0.6)',
  },
  stoppedSubtext: {
    color: '#fda4af',
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});

export default RollButton;
