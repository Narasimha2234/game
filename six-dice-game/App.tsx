import 'react-native-reanimated';
import React, { useState, useEffect } from 'react';
import { useFonts } from 'expo-font';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from './src/store/authStore';
import LoginScreen from './src/screens/LoginScreen';
import GameScreen from './src/screens/GameScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import BottomTabBar, { TabType } from './src/components/BottomTabBar';
import { Colors } from './src/constants/colors';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('game');
  const { isAuthenticated, isInitializing, initializeAuth } = useAuthStore();

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (!fontsLoaded || isInitializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  // If not authenticated, render Login Screen
  if (!isAuthenticated) {
    return (
      <SafeAreaProvider>
        <LoginScreen />
      </SafeAreaProvider>
    );
  }

  // Once authenticated, render main game navigation
  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <View style={styles.screenContainer}>
          {activeTab === 'game' && <GameScreen />}
          {activeTab === 'history' && <HistoryScreen />}
          {activeTab === 'profile' && <ProfileScreen />}
        </View>

        <BottomTabBar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
        />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080b18',
  },
  screenContainer: {
    flex: 1,
  },
  loading: {
    flex: 1,
    backgroundColor: '#080b18',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
