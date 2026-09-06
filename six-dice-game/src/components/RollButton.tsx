import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../store/gameStore';
import { useGameAudio } from '../hooks/useGameAudio';

const RollButton: React.FC = () => {
  const { roll, phase, hapticEnabled } = useGameStore();
  const { playRoll } = useGameAudio();

  const isRolling = phase === 'rolling' || phase === 'landing';

  const handlePress = () => {
    if (isRolling) return;

    if (hapticEnabled && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    playRoll();
    roll();
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.buttonWrap}>
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            styles.pressable,
            pressed && !isRolling && styles.pressed,
          ]}
          disabled={isRolling}
        >
          <LinearGradient
            colors={
              isRolling
                ? ['#475569', '#334155', '#1e293b']
                : ['#c084fc', '#9333ea', '#6d28d9']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            {/* Top highlight line for 3D metallic sheen effect */}
            <View style={styles.topSheen} />

            <Text style={[styles.label, isRolling && styles.labelDisabled]}>
              {isRolling ? 'ROLLING...' : 'PLACE BET'}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
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
});

export default RollButton;
