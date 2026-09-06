export const Colors = {
  // Backgrounds
  background: '#080B18',
  surface: '#111827',
  surfaceAlt: '#1A2235',

  // Primary palette
  primaryDeep: '#312E81',
  primary: '#4338CA',
  primaryLight: '#6366F1',

  // Secondary
  secondary: '#7C3AED',
  secondaryLight: '#9333EA',

  // Accents
  accent: '#38BDF8',
  accentLight: '#67E8F9',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#4B5563',

  // Status
  success: '#22C55E',
  warning: '#F59E0B',

  // Dice
  diceBody: '#F5F0E8',
  dicePip: '#1A1A2E',
  diceShadow: 'rgba(0,0,0,0.6)',

  // Overlays
  glassBackground: 'rgba(17, 24, 39, 0.7)',
  glassBorder: 'rgba(99, 102, 241, 0.2)',
  glowPrimary: 'rgba(99, 102, 241, 0.4)',
  glowAccent: 'rgba(56, 189, 248, 0.3)',

  // Gradients (used as arrays for LinearGradient)
  gradientPrimary: ['#7C3AED', '#38BDF8'] as const,
  gradientBackground: ['#080B18', '#111827'] as const,
  gradientTable: ['#0F172A', '#1E1B4B'] as const,
  gradientButton: ['#7C3AED', '#4338CA', '#38BDF8'] as const,
} as const;
