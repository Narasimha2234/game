import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ImageBackground,
  Modal,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Header from '../components/Header';
import HostCountdownCards from '../components/HostCountdownCards';
import DiceGrid from '../components/DiceGrid';
import BettingControlPanel from '../components/BettingControlPanel';
import RollButton from '../components/RollButton';
import ParticleField from '../components/ParticleField';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';

const FACE_NAMES: Record<number, string> = {
  1: 'Bat',
  2: 'Diamond',
  3: 'Heart',
  4: 'Leaf',
  5: 'Tree',
  6: 'Crown',
};

const FACE_IMAGES: Record<number, any> = {
  1: require('../../assets/dice-faces/png/bat.png'),
  2: require('../../assets/dice-faces/png/dimond.png'),
  3: require('../../assets/dice-faces/png/heart.png'),
  4: require('../../assets/dice-faces/png/leaf.png'),
  5: require('../../assets/dice-faces/png/tree.png'),
  6: require('../../assets/dice-faces/png/WhatsApp Image 2026-09-05 at 12.09.12.png'),
};

export default function GameScreen() {
  const {
    syncServerState,
    winModalVisible,
    lastRoundUserResult,
    closeWinModal,
    hapticEnabled,
    serverPhase,
    timeLeft,
    mode,
    stopMessage,
  } = useGameStore();
  const { user, walletBalance } = useAuthStore();

  // Sync with live server state every 1 second
  useEffect(() => {
    syncServerState(user?.id);
    const interval = setInterval(() => {
      syncServerState(user?.id);
    }, 1000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Auto-close result modal before next round starts if user has not closed it
  useEffect(() => {
    if (
      winModalVisible &&
      (serverPhase === 'BETTING_OPEN' ||
        serverPhase === 'ROLLING' ||
        (serverPhase === 'SETTLED' && timeLeft <= 1))
    ) {
      closeWinModal();
    }
  }, [winModalVisible, serverPhase, timeLeft]);

  const handleCloseResultModal = () => {
    if (hapticEnabled && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    closeWinModal();
  };

  const hasWon = lastRoundUserResult?.hasWon ?? false;
  const wonAmount = lastRoundUserResult?.totalWon ?? 0;
  const betAmount = lastRoundUserResult?.totalBet ?? 0;

  // Trigger celebratory or empathetic haptics when result modal pops up
  useEffect(() => {
    if (winModalVisible && lastRoundUserResult !== null) {
      if (hapticEnabled && Platform.OS !== 'web') {
        if (hasWon) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
    }
  }, [winModalVisible, lastRoundUserResult, hasWon, hapticEnabled]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#080b18" />

      {/* Casino Room & Dealer Background */}
      <ImageBackground
        source={require('../../assets/images/casino_dealer_bg.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        {/* Soft dark vignette & room blur overlay */}
        <LinearGradient
          colors={[
            'rgba(28, 31, 54, 0.65)',
            'rgba(18, 22, 39, 0.25)',
            'rgba(191, 192, 201, 0.32)',
            'rgba(12, 16, 29, 0.95)',
          ]}
          locations={[0, 0.25, 0.65, 1]}
          style={StyleSheet.absoluteFill}
        />

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.viewportContainer}>
            {/* 1. Header Bar */}
            <Header />

            {/* 2. Dealer Host Floating Countdowns Container (Flanking dealer face) */}
            <View style={styles.hostContainer}>
              <HostCountdownCards />
            </View>

            {/* 3. 3D Casino Felt Table Area */}
            <View style={styles.tableArea}>
              <DiceGrid />
            </View>

            {/* 4. Lucky Number Selector & Bet Control Panel */}
            <BettingControlPanel />

            {/* 5. Primary Action CTA Button */}
            <View style={styles.buttonArea}>
              <RollButton />
            </View>
          </View>
        </SafeAreaView>

        {/* Win / Loss Result Modal Overlay */}
        <Modal
          visible={winModalVisible && lastRoundUserResult !== null}
          transparent
          animationType="fade"
          onRequestClose={handleCloseResultModal}
        >
          <View style={styles.modalBackdrop}>
            <LinearGradient
              colors={
                hasWon
                  ? ['#1e1b4b', '#0f172a', '#090d1f']
                  : ['#1e2238', '#0f172a', '#080b18']
              }
              style={[
                styles.modalCard,
                hasWon ? styles.modalCardWin : styles.modalCardLose,
              ]}
            >
              {/* Header Game Image Badge */}
              <View
                style={[
                  styles.iconCircle,
                  hasWon ? styles.iconCircleWin : styles.iconCircleLose,
                ]}
              >
                <Image
                  source={
                    hasWon
                      ? (FACE_IMAGES[Number(lastRoundUserResult?.bets?.find(b => b.status === 'won')?.selectedNumber || 6)] || FACE_IMAGES[6])
                      : (FACE_IMAGES[Number(lastRoundUserResult?.bets?.[0]?.selectedNumber || 1)] || FACE_IMAGES[1])
                  }
                  style={styles.headerFeedbackImage}
                />
              </View>

              {/* Title */}
              <Text style={styles.modalRoundSubtitle}>
                ROUND #{lastRoundUserResult?.roundNumber} RESULT
              </Text>
              <Text
                style={[
                  styles.modalMainTitle,
                  hasWon ? styles.textGold : styles.textLight,
                ]}
              >
                {hasWon ? '🎉 CONGRATULATIONS! 🎉' : 'BETTER LUCK NEXT TIME!'}
              </Text>

              {/* Result Dice Roll PNG Images */}
              <View style={styles.diceOutcomeRow}>
                {lastRoundUserResult?.diceResults?.map((d, i) => {
                  const faceNum = Number(d);
                  return (
                    <View key={i} style={styles.miniDiePill}>
                      {FACE_IMAGES[faceNum] ? (
                        <Image source={FACE_IMAGES[faceNum]} style={styles.miniDieImage} />
                      ) : (
                        <Text style={styles.miniDieFallback}>{faceNum}</Text>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Amount Box */}
              <View
                style={[
                  styles.amountSummaryBox,
                  hasWon ? styles.amountBoxWin : styles.amountBoxLose,
                ]}
              >
                {hasWon ? (
                  <>
                    <Text style={styles.amountLabel}>YOU WON</Text>
                    <Text style={styles.amountValueWin}>+₹{wonAmount}</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.amountLabel}>BET AMOUNT</Text>
                    <Text style={styles.amountValueLose}>-₹{betAmount}</Text>
                    <Text style={styles.amountSubtext}>Better luck next round! Your big win is coming!</Text>
                  </>
                )}
              </View>

              {/* Bets detail breakdown with PNG face images */}
              {lastRoundUserResult?.bets?.map((b, idx) => {
                const faceNum = Number(b.selectedNumber);
                return (
                  <View key={idx} style={styles.betDetailRow}>
                    <View style={styles.betDetailLeft}>
                      {FACE_IMAGES[faceNum] && (
                        <Image source={FACE_IMAGES[faceNum]} style={styles.betDetailImage} />
                      )}
                      <Text style={styles.betDetailFace}>
                        {FACE_NAMES[faceNum] || `Face #${faceNum}`} (₹{b.amount})
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.betDetailPayout,
                        b.status === 'won' ? styles.textGreen : styles.textRed,
                      ]}
                    >
                      {b.status === 'won'
                        ? `+₹${b.payout} (${b.matchingCount} Matches)`
                        : '0 Matches (Lost)'}
                    </Text>
                  </View>
                );
              })}

              {/* Updated Balance Pill */}
              <View style={styles.balancePill}>
                <Text style={styles.balanceLabel}>Current Wallet Balance:</Text>
                <Text style={styles.balanceValue}>₹{walletBalance}</Text>
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={styles.modalCtaButton}
                onPress={handleCloseResultModal}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={
                    hasWon
                      ? ['#c084fc', '#9333ea', '#6d28d9']
                      : ['#475569', '#334155', '#1e293b']
                  }
                  style={styles.modalCtaGradient}
                >
                  <Text style={styles.modalCtaText}>
                    {hasWon
                      ? `COLLECT & CONTINUE (${timeLeft}s)`
                      : `TRY AGAIN (${timeLeft}s)`}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>

            {/* Crisp celebratory confetti rendered on top of screen and modal ONLY for winning players */}
            {hasWon && <ParticleField count={65} />}
          </View>
        </Modal>

        {/* Game Stopped / Admin Pause Notice Modal (Shows Admin's Custom Reason) */}
        <Modal
          visible={mode === 'STOPPED'}
          transparent
          animationType="fade"
        >
          <View style={styles.stoppedModalBackdrop}>
            <LinearGradient
              colors={['#2a1224', '#190a1b', '#0d0411']}
              style={styles.stoppedModalCard}
            >
              {/* Icon Circle */}
              <View style={styles.stoppedIconCircle}>
                <Text style={styles.stoppedIconEmoji}>⏸️</Text>
              </View>

              {/* Status Pill */}
              <View style={styles.stoppedPill}>
                <View style={styles.stoppedPulseDot} />
                <Text style={styles.stoppedPillText}>ADMIN ANNOUNCEMENT</Text>
              </View>

              {/* Title */}
              <Text style={styles.stoppedTitle}>GAME TEMPORARILY PAUSED</Text>

              {/* Admin Custom Message Box */}
              <View style={styles.stoppedMessageBox}>
                <Text style={styles.stoppedQuote}>“</Text>
                <Text style={styles.stoppedMessageText}>
                  {stopMessage || 'Game is temporarily paused by admin. Please check back shortly.'}
                </Text>
                <Text style={styles.stoppedQuote}>”</Text>
              </View>

              {/* Explanatory Footer */}
              <View style={styles.stoppedFooterBox}>
                <Text style={styles.stoppedFooterText}>
                  All bets and dice rolling are currently on hold. The game will automatically resume once the admin reopens the room.
                </Text>
              </View>
            </LinearGradient>
          </View>
        </Modal>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#080b18',
  },
  safeArea: {
    flex: 1,
  },
  viewportContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  hostContainer: {
    position: 'relative',
    height: 70,
  },
  tableArea: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0,
  },
  buttonArea: {
    paddingVertical: 2,
    alignItems: 'center',
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  modalCardWin: {
    borderColor: 'rgba(234, 179, 8, 0.55)',
    shadowColor: '#eab308',
  },
  modalCardLose: {
    borderColor: 'rgba(99, 102, 241, 0.35)',
    shadowColor: '#3b82f6',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    padding: 8,
  },
  iconCircleWin: {
    backgroundColor: 'rgba(234, 179, 8, 0.25)',
    borderColor: '#eab308',
    shadowColor: '#eab308',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  iconCircleLose: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    borderColor: '#64748b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  headerFeedbackImage: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  modalRoundSubtitle: {
    color: '#38bdf8',
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    marginBottom: 2,
  },
  modalMainTitle: {
    fontSize: 22,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 14,
    textAlign: 'center',
  },
  textGold: {
    color: '#fde047',
  },
  textLight: {
    color: '#e2e8f0',
  },
  diceOutcomeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  miniDiePill: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  miniDieImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  miniDieFallback: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
  },
  amountSummaryBox: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
  },
  amountBoxWin: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  amountBoxLose: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  amountLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.8,
  },
  amountValueWin: {
    color: '#4ade80',
    fontSize: 28,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '800',
  },
  amountValueLose: {
    color: '#f87171',
    fontSize: 24,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
  },
  amountSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'Outfit_500Medium',
  },
  betDetailRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  betDetailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  betDetailImage: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  betDetailFace: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },
  betDetailPayout: {
    fontSize: 12,
    fontFamily: 'Outfit_700Bold',
  },
  textGreen: {
    color: '#4ade80',
  },
  textRed: {
    color: '#f87171',
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
  },
  balanceValue: {
    color: '#38bdf8',
    fontSize: 13,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
  },
  modalCtaButton: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalCtaGradient: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCtaText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Stopped Modal Styles
  stoppedModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  stoppedModalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(244, 63, 94, 0.4)',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 24,
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
  },
  stoppedIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(244, 63, 94, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  stoppedIconEmoji: {
    fontSize: 28,
  },
  stoppedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  stoppedPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f43f5e',
  },
  stoppedPillText: {
    color: '#fda4af',
    fontSize: 9.5,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.8,
  },
  stoppedTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Outfit_800ExtraBold',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 16,
  },
  stoppedMessageBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  stoppedQuote: {
    color: '#f43f5e',
    fontSize: 22,
    fontFamily: 'Outfit_700Bold',
    lineHeight: 22,
  },
  stoppedMessageText: {
    color: '#fecdd3',
    fontSize: 13.5,
    fontFamily: 'Outfit_600SemiBold',
    textAlign: 'center',
    lineHeight: 19,
    marginVertical: 4,
  },
  stoppedFooterBox: {
    width: '100%',
    paddingHorizontal: 8,
  },
  stoppedFooterText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10.5,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    lineHeight: 15,
  },
});
