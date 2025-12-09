export default {
  theme: {
    extend: {
      // ========== TYPOGRAPHY SYSTEM ==========
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'], // Elegant headings
        sans: ['"Inter"', 'sans-serif'], // Clean readability
      },
      fontSize: {
        // Display/Hero
        'display-lg': ['3.5rem', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display-md': ['2.5rem', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.01em' }],
        
        // Headings
        'h1': ['2rem', { lineHeight: '1.3', fontWeight: '700', letterSpacing: '-0.01em' }],
        'h2': ['1.75rem', { lineHeight: '1.4', fontWeight: '600' }],
        'h3': ['1.5rem', { lineHeight: '1.4', fontWeight: '600' }],
        'h4': ['1.25rem', { lineHeight: '1.5', fontWeight: '600' }],
        'h5': ['1.125rem', { lineHeight: '1.5', fontWeight: '600' }],
        'h6': ['1rem', { lineHeight: '1.5', fontWeight: '600' }],
        
        // Body
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        'body-base': ['1rem', { lineHeight: '1.6' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        'body-xs': ['0.75rem', { lineHeight: '1.5' }],
        
        // Labels & UI
        'label-lg': ['0.875rem', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '0.02em' }],
        'label-base': ['0.75rem', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '0.05em' }],
        'label-sm': ['0.625rem', { lineHeight: '1.4', fontWeight: '700', letterSpacing: '0.1em' }],
      },
      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
      },
      letterSpacing: {
        tighter: '-0.05em',
        tight: '-0.02em',
        normal: '0em',
        wide: '0.02em',
        wider: '0.05em',
        widest: '0.1em', // For uppercase labels
      },
      lineHeight: {
        tight: '1.2',
        normal: '1.5',
        relaxed: '1.75',
        loose: '2',
      },

      // ========== COLOR SYSTEM ==========
      colors: {
        // Primary Brand Colors
        brand: {
          black: '#121212',     // Softer than #000000
          gray: '#F5F5F5',      // Premium background
          gold: '#D4AF37',      // Subtle accents
        },
        
        // Neutral Scale (Gray)
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#121212',
          950: '#0A0A0A',
        },
        
        // Primary Colors (Brand Extension)
        primary: {
          50: '#F8F4EF',
          100: '#F0E8DF',
          200: '#E0D1BE',
          300: '#D4AF37',
          400: '#C4992F',
          500: '#B8860B',
          600: '#966F09',
          700: '#6F5207',
          800: '#5A4206',
          900: '#3D2C04',
        },
        
        // Secondary Colors (Accent)
        secondary: {
          50: '#F5F7FA',
          100: '#EAEFF7',
          200: '#D5DEEE',
          300: '#99B3D7',
          400: '#5D7FB8',
          500: '#3D5A8C',
          600: '#2D4563',
          700: '#1F3043',
          800: '#161E2C',
          900: '#0E111A',
        },
        
        // Success State
        success: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBEF45',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#145231',
        },
        
        // Warning State
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        
        // Error State
        error: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },
        
        // Info State
        info: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
          800: '#075985',
          900: '#0C4A6E',
        },
      },

      // ========== SPACING SYSTEM ==========
      spacing: {
        'xs': '0.25rem',  // 4px
        'sm': '0.5rem',   // 8px
        'md': '1rem',     // 16px
        'lg': '1.5rem',   // 24px
        'xl': '2rem',     // 32px
        '2xl': '2.5rem',  // 40px
        '3xl': '3rem',    // 48px
        '4xl': '4rem',    // 64px
      },

      // ========== SHADOW & ELEVATION ==========
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'sm': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'elevated': '0 25px 40px -5px rgba(0, 0, 0, 0.15), 0 15px 20px -5px rgba(0, 0, 0, 0.08)',
        'none': 'none',
      },

      // ========== BORDER RADIUS ==========
      borderRadius: {
        'xs': '0.25rem',   // 4px
        'sm': '0.375rem',  // 6px
        'md': '0.5rem',    // 8px
        'lg': '0.75rem',   // 12px
        'xl': '1rem',      // 16px
        '2xl': '1.5rem',   // 24px
        'full': '9999px',
      },

      // ========== TRANSITIONS ==========
      transitionDuration: {
        'fast': '150ms',
        'base': '200ms',
        'slow': '300ms',
        'slower': '500ms',
      },
      transitionTimingFunction: {
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}