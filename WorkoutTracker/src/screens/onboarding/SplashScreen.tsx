// src/screens/onboarding/SplashScreen.tsx

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
  ImageBackground,
  AccessibilityInfo,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Images } from '../../constants/assets';
import { BrandColors, Animations } from '../../constants/theme';
import Logo from '../../components/Logo';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SplashScreenProps {
  isLoading?: boolean;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ isLoading = false }) => {
  const insets = useSafeAreaInsets();

  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.96)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility('Brand splash screen with winding red canyon road in the background.');

    // Animation matching design spec:
    // Initial fade-in: logo opacity 0 → 1 over 1.2s, concurrent scale 0.96 → 1.00
    Animated.parallel([
      // Logo fade and scale animation
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      // Background image fades in simultaneously
      Animated.sequence([
        Animated.delay(600), // Hold black screen for 600ms
        Animated.timing(backgroundOpacity, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    if (isLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoPulse, {
            toValue: 0.85,
            duration: Animations.durations.pulse / 2,
            useNativeDriver: true,
          }),
          Animated.timing(logoPulse, {
            toValue: 1,
            duration: Animations.durations.pulse / 2,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isLoading]);

  const getLogoWidth = () => {
    // Adaptive sizing rule from design spec:
    // logoWidth = clamp(72pt, 0.22 * min(viewportWidth, viewportHeight), 120pt)
    const minDimension = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT);
    const calculatedWidth = 0.22 * minDimension;

    // Clamp between 72 and 120 points
    let logoWidth = Math.max(72, Math.min(calculatedWidth, 120));

    // Default to 80pt for standard iPhone screens (as per design spec)
    if (SCREEN_WIDTH === 390 || SCREEN_WIDTH === 393) {
      logoWidth = 80;
    }

    // Scale up by 1.3x as requested
    return logoWidth * 1.3;
  };

  const logoWidth = getLogoWidth();

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.backgroundContainer,
          { opacity: backgroundOpacity }
        ]}
      >
        <ImageBackground
          source={Images.splash.background}
          style={styles.background}
          resizeMode="cover"
          accessibilityRole="image"
          accessibilityLabel="Aerial canyon road background"
        />
      </Animated.View>

      {/* Diamond Gradient Overlay - 45% opacity */}
      <Animated.View
        style={[
          styles.diamondGradient,
          { opacity: backgroundOpacity }
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(0, 0, 0, 0.45)',
            'rgba(0, 0, 0, 0)',
            'rgba(0, 0, 0, 0)',
            'rgba(0, 0, 0, 0.45)',
          ]}
          locations={[0, 0.3, 0.7, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      <View style={[
        styles.logoWrapper,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }
      ]}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: logoScale }],
              opacity: Animated.multiply(logoOpacity, isLoading ? logoPulse : 1),
            }
          ]}
          accessibilityRole="image"
          accessibilityLabel="App logo"
        >
          <Logo
            width={logoWidth}
            color={BrandColors.white}
          />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.black, // Changed to black background
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  diamondGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  logoWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SplashScreen;