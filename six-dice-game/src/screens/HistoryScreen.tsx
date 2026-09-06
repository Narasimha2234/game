import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';
import { Colors } from '../constants/colors';

interface TransactionItem {
  id: string;
  type: string;
  amount: number;
  status: string;
  note?: string;
  createdAt: string;
}

const HistoryScreen: React.FC = () => {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Backend automatically excludes isHidden: true transactions for players
      const res = await apiClient.get(`/api/transactions/user/${user.id}`);
      const list = res.data?.data || [];
      setTransactions(list);
    } catch (err) {
      console.error('Failed to load player transactions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  // Metrics calculation
  const totalDeposits = transactions
    .filter((t) => t.type === 'deposit' || t.type === 'bonus' || t.type === 'bet_win')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalWithdrawals = transactions
    .filter((t) => t.type === 'withdrawal' || t.type === 'game_play' || t.type === 'bet_loss')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#080b18" />
      <LinearGradient
        colors={['#080b18', '#0d1030', '#111827']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>TRANSACTION LOG</Text>
          <Text style={styles.subtitle}>Deposits, withdrawals & game balance history</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
              colors={[Colors.accent]}
            />
          }
        >
          {/* Summary stats card */}
          <View style={styles.statsCard}>
            <LinearGradient
              colors={['rgba(124,58,237,0.2)', 'rgba(30,27,75,0.5)']}
              style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
            />
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValuePositive}>+₹{totalDeposits.toLocaleString('en-IN')}</Text>
                <Text style={styles.statLabel}>Total Inflow</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValueNegative}>-₹{totalWithdrawals.toLocaleString('en-IN')}</Text>
                <Text style={styles.statLabel}>Total Outflow</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{transactions.length}</Text>
                <Text style={styles.statLabel}>Tx Count</Text>
              </View>
            </View>
          </View>

          {/* Transactions List */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>RECENT TRANSACTIONS</Text>
            <TouchableOpacity onPress={onRefresh}>
              <Text style={styles.refreshText}>↻ Refresh</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Colors.accent} size="small" />
              <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
          ) : transactions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>📜</Text>
              <Text style={styles.emptyTitle}>No Transactions Yet</Text>
              <Text style={styles.emptyDesc}>
                Your deposits, withdrawals, and game winnings will appear right here.
              </Text>
            </View>
          ) : (
            transactions.map((tx) => {
              const isCredit =
                tx.type === 'deposit' || tx.type === 'bonus' || tx.type === 'bet_win';

              let iconEmoji = '💳';
              if (tx.type === 'deposit') iconEmoji = '💰';
              if (tx.type === 'withdrawal') iconEmoji = '🏧';
              if (tx.type === 'game_play' || tx.type === 'bet') iconEmoji = '🎲';
              if (tx.type === 'bet_win') iconEmoji = '🏆';

              const formattedDate = tx.createdAt
                ? new Date(tx.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—';

              return (
                <View key={tx.id} style={styles.txCard}>
                  <View style={styles.txLeft}>
                    <View
                      style={[
                        styles.iconCircle,
                        isCredit ? styles.iconCirclePositive : styles.iconCircleNegative,
                      ]}
                    >
                      <Text style={styles.txIcon}>{iconEmoji}</Text>
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={styles.txTypeTitle}>
                        {tx.type.replace('_', ' ').toUpperCase()}
                      </Text>
                      <Text style={styles.txNote} numberOfLines={1}>
                        {tx.note || 'Wallet transaction'}
                      </Text>
                      <Text style={styles.txDate}>{formattedDate}</Text>
                    </View>
                  </View>

                  <View style={styles.txRight}>
                    <Text
                      style={[
                        styles.txAmount,
                        isCredit ? styles.txAmountPositive : styles.txAmountNegative,
                      ]}
                    >
                      {isCredit ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
                    </Text>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>{tx.status.toUpperCase()}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#080b18',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  statsCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
    overflow: 'hidden',
    marginBottom: 4,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: Colors.accentLight,
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
  },
  statValuePositive: {
    color: '#34d399',
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
  },
  statValueNegative: {
    color: '#f87171',
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontFamily: 'Outfit_500Medium',
    marginTop: 3,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 6,
  },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 1.2,
  },
  refreshText: {
    color: '#38bdf8',
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
  },
  loadingBox: {
    padding: 30,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
  },
  emptyCard: {
    borderRadius: 20,
    backgroundColor: 'rgba(17,24,39,0.7)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 28,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 10,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyDesc: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    lineHeight: 16,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(17,24,39,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 14,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCirclePositive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  iconCircleNegative: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  txIcon: {
    fontSize: 18,
  },
  txInfo: {
    flex: 1,
  },
  txTypeTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  txNote: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 1,
  },
  txDate: {
    color: Colors.textMuted,
    fontSize: 10,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  txAmount: {
    fontSize: 15,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
  },
  txAmountPositive: {
    color: '#34d399',
  },
  txAmountNegative: {
    color: '#f87171',
  },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: Colors.textMuted,
    fontSize: 9,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.5,
  },
});

export default HistoryScreen;
