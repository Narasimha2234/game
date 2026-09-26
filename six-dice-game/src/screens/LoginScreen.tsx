import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { getBackendBaseUrl, STORAGE_KEYS, apiClient } from '../api/client';
import { Colors } from '../constants/colors';

const LoginScreen: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Server URL configuration modal
  const [serverUrl, setServerUrl] = useState(getBackendBaseUrl());
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [customServerInput, setCustomServerInput] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.API_BASE_URL).then((saved) => {
      if (saved) {
        setServerUrl(saved);
        setCustomServerInput(saved);
      } else {
        const detected = getBackendBaseUrl();
        setServerUrl(detected);
        setCustomServerInput(detected);
      }
    });
  }, []);

  const handleSaveServerUrl = async () => {
    const trimmed = customServerInput.trim();
    if (trimmed) {
      await AsyncStorage.setItem(STORAGE_KEYS.API_BASE_URL, trimmed);
      apiClient.defaults.baseURL = trimmed;
      setServerUrl(trimmed);
    }
    setIsServerModalOpen(false);
  };

  const handleResetServerUrl = async () => {
    const detected = getBackendBaseUrl();
    await AsyncStorage.removeItem(STORAGE_KEYS.API_BASE_URL);
    apiClient.defaults.baseURL = detected;
    setServerUrl(detected);
    setCustomServerInput(detected);
    setIsServerModalOpen(false);
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) return;
    await login(username.trim(), password);
  };

  const handleQuickFill = () => {
    clearError();
    setUsername('9123456780');
    setPassword('playerpass123');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#080b18" />
      <LinearGradient
        colors={['#080b18', '#0e1428', '#130d2a', '#080b18']}
        locations={[0, 0.35, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative background glow circles */}
      <View style={styles.glowTopRight} pointerEvents="none" />
      <View style={styles.glowBottomLeft} pointerEvents="none" />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header / Logo */}
            <View style={styles.logoSection}>
              <View style={styles.logoCircle}>
                <LinearGradient
                  colors={['#7c3aed', '#ec4899']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <Text style={styles.logoDiceEmoji}>🎲</Text>
              </View>

              <View style={styles.titleRow}>
                <Text style={styles.titleMain}>GOOD</Text>
                <Text style={styles.titleAccent}>GUDI</Text>
              </View>
              <Text style={styles.subtitle}>REAL-TIME 3D DICE GAME</Text>
            </View>

            {/* Login Form Card */}
            <View style={styles.formCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']}
                style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
              />

              <Text style={styles.formHeading}>Player Sign In</Text>
              <Text style={styles.formSubtext}>Enter your mobile number or username</Text>

              {/* Error Alert */}
              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Mobile / Username Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mobile / Username</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>📱</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 9876543210"
                    placeholderTextColor="rgba(148, 163, 184, 0.5)"
                    value={username}
                    onChangeText={(text) => {
                      clearError();
                      setUsername(text);
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter password"
                    placeholderTextColor="rgba(148, 163, 184, 0.5)"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(text) => {
                      clearError();
                      setPassword(text);
                    }}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '🙈'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submit CTA Button */}
              <TouchableOpacity
                style={[styles.submitButton, (!username || !password) && styles.submitButtonDisabled]}
                onPress={handleLogin}
                disabled={isLoading || !username || !password}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#7c3aed', '#3b82f6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
                />
                {isLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#ffffff" size="small" />
                    <Text style={styles.submitButtonText}>Connecting to Game...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>ENTER GAME ROOM</Text>
                )}
              </TouchableOpacity>

              {/* Quick Fill / Demo Option */}
              <TouchableOpacity
                onPress={handleQuickFill}
                style={styles.quickFillBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.quickFillText}>⚡ Quick Fill Test Player (9123456780)</Text>
              </TouchableOpacity>
            </View>

            {/* Server Connection Chip */}
            <TouchableOpacity
              style={styles.serverChip}
              onPress={() => {
                setCustomServerInput(serverUrl);
                setIsServerModalOpen(true);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.serverStatusDot} />
              <Text style={styles.serverChipText} numberOfLines={1}>
                Server: {serverUrl}
              </Text>
              <Text style={styles.serverEditIcon}>⚙️</Text>
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Need an account? Contact the game administrator.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Server Configuration Modal */}
      <Modal
        visible={isServerModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsServerModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Backend Server Address</Text>
            <Text style={styles.modalDesc}>
              Set the host computer URL where NestJS backend is running.
            </Text>

            <TextInput
              style={styles.modalInput}
              value={customServerInput}
              onChangeText={setCustomServerInput}
              placeholder="http://192.168.0.101:8080"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalResetBtn}
                onPress={handleResetServerUrl}
              >
                <Text style={styles.modalResetText}>Auto Detect</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveServerUrl}
              >
                <Text style={styles.modalSaveText}>Save & Connect</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  glowTopRight: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  logoDiceEmoji: {
    fontSize: 32,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleMain: {
    color: '#ffffff',
    fontSize: 24,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
    letterSpacing: 2,
  },
  titleAccent: {
    color: '#38bdf8',
    fontSize: 24,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
    letterSpacing: 2,
  },
  subtitle: {
    color: 'rgba(148, 163, 184, 0.8)',
    fontSize: 9,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 2,
    marginTop: 3,
  },
  formCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  formHeading: {
    color: '#ffffff',
    fontSize: 19,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
  },
  formSubtext: {
    color: 'rgba(148, 163, 184, 0.8)',
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
    marginBottom: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  errorIcon: {
    fontSize: 14,
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    flex: 1,
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
  eyeButton: {
    padding: 4,
  },
  eyeIcon: {
    fontSize: 15,
  },
  submitButton: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Outfit_700Bold',
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  quickFillBtn: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 4,
  },
  quickFillText: {
    color: '#38bdf8',
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },
  serverChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 16,
    gap: 6,
    maxWidth: '90%',
  },
  serverStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
  },
  serverChipText: {
    color: '#94a3b8',
    fontSize: 10,
    fontFamily: 'Outfit_500Medium',
    flexShrink: 1,
  },
  serverEditIcon: {
    fontSize: 10,
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    color: 'rgba(148, 163, 184, 0.6)',
    fontSize: 10,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
  },
  modalDesc: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 16,
  },
  modalInput: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  modalResetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  modalResetText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },
  modalSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#7c3aed',
  },
  modalSaveText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Outfit_700Bold',
  },
});

export default LoginScreen;
