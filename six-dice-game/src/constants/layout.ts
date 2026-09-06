import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const Layout = {
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,

  // Dice canvas takes up the center portion of the screen
  canvasHeight: SCREEN_HEIGHT * 0.42,

  // Dice sizing
  diceSize: 0.85,
  diceSpacing: 2.0,

  // Padding / margins
  paddingHorizontal: 20,
  paddingVertical: 16,

  // Border radii
  radiusSmall: 8,
  radiusMedium: 16,
  radiusLarge: 24,
  radiusXL: 32,

  // Roll button
  rollButtonHeight: 72,
  rollButtonBorderRadius: 36,

  // Score panel
  scorePanelHeight: 100,
} as const;
