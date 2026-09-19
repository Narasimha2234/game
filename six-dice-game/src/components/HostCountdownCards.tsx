import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../store/gameStore';

const HostCountdownCards: React.FC = () => {
  const { serverPhase, timeLeft, roundNumber, mode } = useGameStore();

  const isBettingOpen = serverPhase === 'BETTING_OPEN' && mode !== 'STOPPED';
  const isRolling = serverPhase === 'ROLLING';
  const isStopped = mode === 'STOPPED';

  // Pulse animation for the countdown ring
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isBettingOpen || isRolling) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isBettingOpen, isRolling]);

  // Dynamic Theme Colors
  let badgeColor = '#4ade80';
  let badgeBorder = 'rgba(74, 222, 128, 0.4)';
  let statusText = 'BET OPEN';
  let ringBg = 'rgba(34, 197, 94, 0.15)';

  if (isStopped) {
    badgeColor = '#f87171';
    badgeBorder = 'rgba(248, 113, 113, 0.4)';
    statusText = 'PAUSED';
    ringBg = 'rgba(239, 68, 68, 0.15)';
  } else if (isRolling) {
    badgeColor = '#fde047';
    badgeBorder = 'rgba(253, 224, 71, 0.4)';
    statusText = 'ROLLING';
    ringBg = 'rgba(234, 179, 8, 0.15)';
  } else if (serverPhase === 'SETTLED') {
    badgeColor = '#c084fc';
    badgeBorder = 'rgba(192, 132, 252, 0.4)';
    statusText = 'SETTLED';
    ringBg = 'rgba(168, 85, 247, 0.15)';
  }

  return (
    <View style={styles.flankingContainer}>
      {/* LEFT FLANKING CARD: Active Round Number */}
      <View style={[styles.flankCard, { borderColor: badgeBorder }]}>
        <LinearGradient
          colors={['rgba(15, 23, 42, 0.92)', 'rgba(8, 11, 24, 0.95)']}
          style={styles.cardInner}
        >
          <Text style={styles.cardHeaderLabel}>ROUND</Text>
          <Text style={styles.roundValue}>#{roundNumber}</Text>
          <View style={[styles.statusPill, { backgroundColor: ringBg, borderColor: badgeBorder }]}>
            <View style={[styles.statusDot, { backgroundColor: badgeColor }]} />
            <Text style={[styles.statusPillText, { color: badgeColor }]}>{statusText}</Text>
          </View>
        </LinearGradient>
      </View>

      {/* CENTER AREA IS COMPLETELY CLEAR (Dealer Face is 100% visible) */}
      <View style={styles.centerClearSpace} pointerEvents="none" />

      {/* RIGHT FLANKING CARD: Phase Timer Countdown */}
      <View style={[styles.flankCard, { borderColor: badgeBorder }]}>
        <LinearGradient
          colors={['rgba(15, 23, 42, 0.92)', 'rgba(8, 11, 24, 0.95)']}
          style={styles.cardInner}
        >
          <Text style={styles.cardHeaderLabel}>
            {isBettingOpen ? 'CLOSING IN' : isRolling ? 'ROLLING' : 'NEXT ROUND'}
          </Text>

          <Animated.View
            style={[
              styles.timerRing,
              { borderColor: badgeColor, backgroundColor: ringBg },
              (isBettingOpen || isRolling) && { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Text style={styles.timerValue}>{isStopped ? '—' : `${timeLeft}s`}</Text>
          </Animated.View>

          <Text style={[styles.phaseSubtext, { color: badgeColor }]}>
            {isBettingOpen ? 'ACCEPTING' : isRolling ? 'LOCK' : 'WAIT'}
          </Text>
        </LinearGradient>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  flankingContainer: {
    position: 'absolute',
    top: 4,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 15,
  },
  flankCard: {
    width: 92,
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 8,
  },
  cardInner: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerClearSpace: {
    flex: 1, // Leaves center completely open so dealer face is 100% clear
  },
  cardHeaderLabel: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 8,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.5,
    marginBottom: 2,
    textAlign: 'center',
  },
  roundValue: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '800',
    marginBottom: 3,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    gap: 3,
  },
  statusDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.5,
  },
  statusPillText: {
    fontSize: 7.5,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.4,
  },
  timerRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  timerValue: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '800',
  },
  phaseSubtext: {
    fontSize: 7.5,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.4,
  },
});

export default HostCountdownCards;
