import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { Colors } from '../constants/colors';

const DieChip: React.FC<{ value: number }> = ({ value }) => {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  );
};

const ScorePanel: React.FC = () => {
  const { score, results, phase } = useGameStore();
  const isVisible = phase === 'landed' || phase === 'idle' || phase === 'done';

  const resultColorMap: Record<string, string> = {
    default: Colors.textSecondary,
    success: Colors.success,
    warning: Colors.warning,
    accent: Colors.accentLight,
  };

  const resultColor = score
    ? (resultColorMap[score.resultColor] ?? Colors.textSecondary)
    : Colors.textSecondary;

  return (
    <View style={styles.container}>
      {/* Compact Chips Row */}
      <View style={styles.chipsRow}>
        {results.map((v, i) => (
          <DieChip key={i} value={v} />
        ))}
      </View>

      {/* Compact Total & Result Label */}
      <View style={styles.summaryRight}>
        <View style={styles.totalPill}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>{score?.total ?? 0}</Text>
        </View>

        {score && isVisible && (
          <View style={styles.categoryBadge}>
            <Text style={[styles.categoryText, { color: resultColor }]}>
              {score.resultLabel}
            </Text>
          </View>
        )}
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
    paddingVertical: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  chip: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(17,24,39,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipValue: {
    color: '#38bdf8',
    fontSize: 13,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
  },
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11,15,30,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.35)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  totalLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 1,
  },
  totalValue: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
  },
  categoryBadge: {
    backgroundColor: 'rgba(124,58,237,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.4)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    fontWeight: '600',
  },
});

export default ScorePanel;
