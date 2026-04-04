/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,ts,tsx}', './src/**/*.{js,ts,tsx}', './src/**/*.css'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Primary colors
        primary: '#5DB075',
        'on-primary': '#003919',
        'primary-container': '#00532A',
        'on-primary-container': '#78D892',

        // Secondary colors
        secondary: '#B6CCBE',
        'on-secondary': '#213630',

        // Background and surface colors
        background: '#1A1C19',
        'on-background': '#E2E3DD',
        surface: '#1A1C19',
        'on-surface': '#E2E3DD',
        'surface-variant': '#3F4945',
        'on-surface-variant': '#BFC9C2',

        // Utility colors
        outline: '#899389',
        error: '#FFB4AB',
        success: '#5DB075',
        warning: '#FFA726',

        // Legacy garden colors (for backwards compatibility)
        garden: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
      },
      fontSize: {
        'display-large': ['57px', { lineHeight: '64px' }],
        'display-medium': ['45px', { lineHeight: '52px' }],
        'display-small': ['36px', { lineHeight: '44px' }],
        'headline-large': ['32px', { lineHeight: '40px' }],
        'headline-medium': ['28px', { lineHeight: '36px' }],
        'headline-small': ['24px', { lineHeight: '32px' }],
        'title-large': ['22px', { lineHeight: '28px' }],
        'title-medium': ['16px', { lineHeight: '24px', fontWeight: '500' }],
        'title-small': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        'body-large': ['16px', { lineHeight: '24px' }],
        'body-medium': ['14px', { lineHeight: '20px' }],
        'body-small': ['12px', { lineHeight: '16px' }],
        'label-large': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        'label-medium': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'label-small': ['11px', { lineHeight: '16px', fontWeight: '500' }],
      },
      spacing: {
        'touch-target': '48px',
      },
    },
  },
  plugins: [],
};
