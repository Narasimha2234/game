import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { Colors } from '../constants/colors';

const ProfileScreen: React.FC = () => {
  const { user, walletBalance, refreshWallet, logout } = useAuthStore();
  const { soundEnabled, hapticEnabled, toggleSound, toggleHaptic } = useGameStore();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to log out of Goodgudi?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Recently';

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
          <Text style={styles.title}>PLAYER ACCOUNT</Text>
          <Text style={styles.subtitle}>Profile details & preferences</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Player avatar & level badge card */}
          <View style={styles.profileCard}>
            <LinearGradient
              colors={['rgba(56,189,248,0.15)', 'rgba(30,27,75,0.4)']}
              style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
            />
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>
                {user?.name ? user.name.charAt(0).toUpperCase() : '🎲'}
              </Text>
            </View>
            <Text style={styles.playerName}>{user?.name || 'Active Player'}</Text>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>
                {user?.role === 'admin' ? '⭐ GAME ADMINISTRATOR' : '🎲 REGISTERED PLAYER'}
              </Text>
            </View>
          </View>

          {/* Wallet Balance Card */}
          <View style={styles.walletCard}>
            <LinearGradient
              colors={['rgba(16, 185, 129, 0.15)', 'rgba(6, 78, 59, 0.3)']}
              style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
            />
            <View style={styles.walletHeader}>
              <Text style={styles.walletLabel}>CURRENT WALLET BALANCE</Text>
              <TouchableOpacity onPress={() => refreshWallet()}>
                <Text style={styles.walletRefresh}>↻ Refresh</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.walletAmount}>
              ₹{Number(walletBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
            <Text style={styles.walletSubtext}>Available for bets in Goodgudi</Text>
          </View>

          {/* Account Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACCOUNT DETAILS</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mobile Number</Text>
              <Text style={styles.detailValue}>{user?.mobile || '—'}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email Address</Text>
              <Text style={styles.detailValue}>{user?.email || '—'}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Account Status</Text>
              <Text style={styles.detailActive}>
                {user?.isActive !== false ? '● Active' : '○ Inactive'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Member Since</Text>
              <Text style={styles.detailValue}>{joinedDate}</Text>
            </View>
          </View>

          {/* Gaming Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>GAME AUDIO & HAPTICS</Text>

            <TouchableOpacity style={styles.settingRow} onPress={toggleSound}>
              <Text style={styles.settingLabel}>Sound Effects (SFX)</Text>
              <Text style={soundEnabled ? styles.settingOn : styles.settingOff}>
                {soundEnabled ? 'ENABLED' : 'MUTED'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingRow} onPress={toggleHaptic}>
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
              <Text style={hapticEnabled ? styles.settingOn : styles.settingOff}>
                {hapticEnabled ? 'ENABLED' : 'DISABLED'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutText}>🚪 SIGN OUT</Text>
          </TouchableOpacity>
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
    gap: 14,
  },
  profileCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(124,58,237,0.3)',
    borderWidth: 2,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 28,
    color: '#ffffff',
    fontFamily: 'Outfit_700Bold',
  },
  playerName: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
  },
  rankBadge: {
    marginTop: 4,
    backgroundColor: 'rgba(124,58,237,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  rankText: {
    color: Colors.accentLight,
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 1,
  },
  walletCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    overflow: 'hidden',
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletLabel: {
    color: '#6ee7b7',
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 1,
  },
  walletRefresh: {
    color: '#34d399',
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
  },
  walletAmount: {
    color: '#34d399',
    fontSize: 26,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
    marginTop: 4,
  },
  walletSubtext: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  section: {
    borderRadius: 20,
    backgroundColor: 'rgba(17,24,39,0.7)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  detailLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  detailValue: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  detailActive: {
    color: '#34d399',
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  settingLabel: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },
  settingOn: {
    color: '#34d399',
    fontSize: 12,
    fontFamily: 'Outfit_700Bold',
  },
  settingOff: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },
  logoutButton: {
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  logoutText: {
    color: '#f87171',
    fontSize: 13,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1.5,
  },
});

export default ProfileScreen;
