/**
 * Theme colors for My Little Garden app
 * Based on Material Design 3 dark theme with nature-inspired palette
 */
export const theme = {
  colors: {
    // Primary colors
    primary: '#5DB075',
    onPrimary: '#003919',
    primaryContainer: '#00532A',
    onPrimaryContainer: '#78D892',

    // Secondary colors
    secondary: '#B6CCBE',
    onSecondary: '#213630',

    // Background and surface colors
    background: '#1A1C19',
    onBackground: '#E2E3DD',
    surface: '#1A1C19',
    onSurface: '#E2E3DD',
    surfaceVariant: '#3F4945',
    onSurfaceVariant: '#BFC9C2',

    // Utility colors
    outline: '#899389',
    error: '#FFB4AB',
    success: '#5DB075',
    warning: '#FFA726',
  },

  // Spacing values (in dp)
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  // Typography sizes (in sp)
  typography: {
    displayLarge: 57,
    displayMedium: 45,
    displaySmall: 36,
    headlineLarge: 32,
    headlineMedium: 28,
    headlineSmall: 24,
    titleLarge: 22,
    titleMedium: 16,
    titleSmall: 14,
    bodyLarge: 16,
    bodyMedium: 14,
    bodySmall: 12,
    labelLarge: 14,
    labelMedium: 12,
    labelSmall: 11,
  },

  // Touch target sizes (in dp) - following Android accessibility guidelines
  touchTarget: {
    minimum: 48,
  },
} as const;

export type ThemeColors = typeof theme.colors;
export type ThemeSpacing = typeof theme.spacing;
export type ThemeTypography = typeof theme.typography;
