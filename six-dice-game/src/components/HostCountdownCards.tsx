import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const HostCountdownCards: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Left Card: BETTING ENDS IN */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>BETTING ENDS IN</Text>
        <View style={[styles.ring, styles.ringGreen]}>
          <Text style={styles.ringValue}>42s</Text>
        </View>
        <Text style={[styles.cardStatus, styles.statusGreen]}>BET OPEN</Text>
      </View>

      {/* Right Card: ROLLING IN */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>ROLLING IN</Text>
        <View style={[styles.ring, styles.ringGold]}>
          <Text style={styles.ringValue}>10s</Text>
        </View>
        <Text style={[styles.cardStatus, styles.statusGold]}>ROLLING</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 4,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    pointerEvents: 'none',
    zIndex: 10,
  },
  card: {
    width: 96,
    backgroundColor: 'rgba(8,11,24,0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(124,58,237,0.5)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 5,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  ring: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  ringGreen: {
    borderColor: '#22c55e',
  },
  ringGold: {
    borderColor: '#eab308',
  },
  ringValue: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
  },
  cardStatus: {
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusGreen: {
    color: '#4ade80',
  },
  statusGold: {
    color: '#fde047',
  },
});

export default HostCountdownCards;
