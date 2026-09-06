import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

const StatusBanner: React.FC = () => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.capsule}>
        <Text style={styles.sparkle}>✦</Text>
        <Text style={styles.text}>Select a number (1–6) and confirm bet</Text>
        <Text style={styles.sparkle}>✦</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    marginVertical: 4,
    alignItems: 'center',
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,24,39,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.35)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  sparkle: {
    color: '#fbbf24',
    fontSize: 12,
  },
  text: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default StatusBanner;
