import React from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import HostCountdownCards from '../components/HostCountdownCards';
import DiceGrid from '../components/DiceGrid';
import BettingControlPanel from '../components/BettingControlPanel';
import RollButton from '../components/RollButton';

export default function GameScreen() {
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

            {/* 2. Dealer Host Floating Countdowns Container */}
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
});
