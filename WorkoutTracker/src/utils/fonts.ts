// src/utils/fonts.ts

/**
 * Font family constants for consistent typography throughout the app
 * These correspond to the fonts loaded in App.tsx
 */

export const FONTS = {
  // Google Fonts from @expo-google-fonts/poppins
  regular: 'Poppins-Regular',      // 400 weight
  medium: 'Poppins-Medium',        // 500 weight  
  semiBold: 'Poppins-SemiBold',    // 600 weight
  bold: 'Poppins-Bold',            // 700 weight
  
  // Custom font from assets
  extraBold: 'Poppins-ExtraBold',  // 800 weight (your custom font)
} as const;

/**
 * Pre-defined text styles for common use cases
 * Use these for consistent typography across the app
 */
export const TEXT_STYLES = {
  // Headers and Titles
  h1: {
    fontFamily: FONTS.extraBold,
    fontSize: 28,
    lineHeight: 36,
  },
  h2: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    lineHeight: 32,
  },
  h3: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    lineHeight: 26,
  },
  
  // Screen Titles (like "Get Your Account Back")
  screenTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 28,
    lineHeight: 28,
  },
  
  // Body Text
  bodyLarge: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    lineHeight: 22,
  },
  bodyMedium: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  
  // Buttons
  buttonLarge: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    lineHeight: 20,
  },
  buttonMedium: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    lineHeight: 18,
  },
  buttonSmall: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  
  // Input Fields
  input: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    lineHeight: 20,
  },
  inputLabel: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 18,
  },
  
  // Captions and Labels
  caption: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  
  // Navigation
  tabLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  
} as const;

/**
 * Helper function to get font family by weight
 * Useful when you need to dynamically select font weight
 */
export const getFontByWeight = (weight: 400 | 500 | 600 | 700 | 800): string => {
  switch (weight) {
    case 400:
      return FONTS.regular;
    case 500:
      return FONTS.medium;
    case 600:
      return FONTS.semiBold;
    case 700:
      return FONTS.bold;
    case 800:
      return FONTS.extraBold;
    default:
      return FONTS.regular;
  }
};

/**
 * Type definitions for TypeScript support
 */
export type FontFamily = typeof FONTS[keyof typeof FONTS];
export type TextStyleKey = keyof typeof TEXT_STYLES;