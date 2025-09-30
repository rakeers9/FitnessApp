import { createConfig } from '@gluestack-style/react';
import { config as defaultConfig } from '@gluestack-ui/themed';

export const config = createConfig({
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    colors: {
      ...defaultConfig.tokens.colors,
      // Custom brand colors
      primary: '#FFFFFF',
      primaryForeground: '#000000',
      background: '#000000',
      foreground: '#FFFFFF',
      mutedForeground: '#FFFFFFB8',
      accent: '#17D4D4',
      // Override default colors
      primary0: '#FFFFFF',
      primary50: '#F2F2F2',
      primary100: '#E6E6E6',
      primary200: '#CCCCCC',
      primary300: '#B3B3B3',
      primary400: '#999999',
      primary500: '#808080',
      primary600: '#666666',
      primary700: '#4D4D4D',
      primary800: '#333333',
      primary900: '#1A1A1A',
      primary950: '#000000',
    },
    space: {
      ...defaultConfig.tokens.space,
      // Custom spacing matching design spec
      'px': 1,
      '0': 0,
      '0.5': 2,
      '1': 4,
      '1.5': 6,
      '2': 8,
      '2.5': 10,
      '3': 12,
      '3.5': 14,
      '4': 16,
      '5': 20,
      '6': 24,
      '7': 28,
      '8': 32,
      '9': 36,
      '10': 40,
      '11': 44,
      '12': 48,
      '14': 56,
      '16': 64,
      '20': 80,
      '24': 96,
      '28': 112,
      '32': 128,
      '36': 144,
      '40': 160,
      '44': 176,
      '48': 192,
      '52': 208,
      '56': 224,
      '60': 240,
      '64': 256,
      '72': 288,
      '80': 320,
      '86': 345, // Custom for content width
      '96': 384,
    },
    radii: {
      ...defaultConfig.tokens.radii,
      none: 0,
      xs: 2,
      sm: 4,
      md: 6,
      lg: 8,
      xl: 12,
      '2xl': 16,
      '3xl': 24,
      full: 9999,
    },
    fonts: {
      heading: 'Poppins-SemiBold',
      body: 'Poppins-Regular',
      mono: undefined,
    },
    fontSizes: {
      ...defaultConfig.tokens.fontSizes,
      '2xs': 10,
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
      '5xl': 48,
      '6xl': 60,
      '7xl': 72,
      '8xl': 96,
      '9xl': 128,
    },
    lineHeights: {
      ...defaultConfig.tokens.lineHeights,
      '2xs': 16,
      xs: 18,
      sm: 20,
      md: 24,
      lg: 26,
      xl: 28,
      '2xl': 32,
      '3xl': 36,
      '4xl': 42,
      '5xl': 56,
      '6xl': 72,
      '7xl': 90,
      '8xl': 120,
      '9xl': 156,
    },
  },
  components: {
    Button: {
      theme: {
        variants: {
          variant: {
            default: {
              bg: '$primary',
              borderColor: '$primary',
              _text: {
                color: '$primaryForeground',
              },
              _icon: {
                color: '$primaryForeground',
              },
              _spinner: {
                props: {
                  color: '$primaryForeground',
                },
              },
              ':hover': {
                bg: '$primary50',
                borderColor: '$primary50',
              },
              ':active': {
                bg: '$primary100',
                borderColor: '$primary100',
              },
            },
          },
          size: {
            lg: {
              px: '$8',
              h: '$14', // 56px
              _text: {
                fontSize: '$md',
                lineHeight: '$sm',
              },
            },
          },
        },
      },
    },
    Text: {
      theme: {
        variants: {
          variant: {
            title: {
              fontFamily: 'Poppins-Medium',
              fontSize: '$3xl',
              lineHeight: '$3xl',
              letterSpacing: -0.2,
              color: '$foreground',
            },
            subtitle: {
              fontFamily: 'Poppins-Regular',
              fontSize: '$md',
              lineHeight: '$md',
              color: '$mutedForeground',
            },
            link: {
              fontFamily: 'Poppins-Medium',
              fontSize: '$sm',
              lineHeight: '$sm',
              color: '$foreground',
            },
          },
        },
      },
    },
  },
});