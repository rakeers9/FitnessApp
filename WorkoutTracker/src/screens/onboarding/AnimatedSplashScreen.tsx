import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, G, Defs, LinearGradient as SvgGradient, Stop, Circle } from 'react-native-svg';
import { Images } from '../../constants/assets';
import { BrandColors } from '../../constants/theme';
import Logo from '../../components/Logo';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AnimatedSplashScreenProps {
  onAnimationComplete?: () => void;
}

const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({
  onAnimationComplete
}) => {
  const insets = useSafeAreaInsets();

  // Animation values
  const blackScreenOpacity = useRef(new Animated.Value(1)).current;
  const logoInitialScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const borderAnimation = useRef(new Animated.Value(0)).current;
  const swooshRotation = useRef(new Animated.Value(0)).current;
  const backgroundImageOpacity = useRef(new Animated.Value(0)).current;
  const finalLogoScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animation sequence
    Animated.sequence([
      // Step 1: Logo appears with scale animation
      Animated.parallel([
        Animated.spring(logoInitialScale, {
          toValue: 1,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]),

      // Step 2: Color swoosh around logo borders
      Animated.parallel([
        Animated.timing(borderAnimation, {
          toValue: 1,
          duration: 1200,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
        Animated.timing(swooshRotation, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),

      // Step 3: Transition to background image
      Animated.parallel([
        Animated.timing(blackScreenOpacity, {
          toValue: 0,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundImageOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.spring(finalLogoScale, {
          toValue: 0.9,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      if (onAnimationComplete) {
        setTimeout(onAnimationComplete, 500);
      }
    });
  }, []);

  const getLogoWidth = () => {
    const isCompactPhone = SCREEN_WIDTH <= 360;
    const isTablet = SCREEN_WIDTH >= 768;

    if (isCompactPhone) {
      return Math.min(0.52 * SCREEN_WIDTH, 172);
    } else if (isTablet) {
      return Math.min(420, 0.28 * SCREEN_HEIGHT);
    } else {
      return Math.min(0.405 * SCREEN_WIDTH, 0.28 * SCREEN_HEIGHT);
    }
  };

  const logoWidth = getLogoWidth();
  const swooshRadius = logoWidth * 0.7;

  // Interpolations for swoosh effect
  const swooshOpacity = borderAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 0],
  });

  const swooshScale = borderAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 1.2, 1.4],
  });

  const rotateAnimation = swooshRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Background Image (initially hidden) */}
      <Animated.View
        style={[
          styles.backgroundContainer,
          { opacity: backgroundImageOpacity }
        ]}
      >
        <ImageBackground
          source={Images.splash.background}
          style={styles.background}
          resizeMode="cover"
        />
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

      {/* Black Screen Overlay */}
      <Animated.View
        style={[
          styles.blackScreen,
          { opacity: blackScreenOpacity }
        ]}
      />

      {/* Logo Container */}
      <View style={[
        styles.logoWrapper,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }
      ]}>
        {/* Color Swoosh Effect */}
        <Animated.View
          style={[
            styles.swooshContainer,
            {
              opacity: swooshOpacity,
              transform: [
                { scale: swooshScale },
                { rotate: rotateAnimation }
              ],
            }
          ]}
        >
          <Svg
            width={swooshRadius * 2}
            height={swooshRadius * 2}
            viewBox={`0 0 ${swooshRadius * 2} ${swooshRadius * 2}`}
            style={styles.swooshSvg}
          >
            <Defs>
              <SvgGradient id="swooshGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={BrandColors.terracotta500} stopOpacity="1" />
                <Stop offset="25%" stopColor={BrandColors.terracotta400} stopOpacity="0.8" />
                <Stop offset="50%" stopColor="#FF6B6B" stopOpacity="0.6" />
                <Stop offset="75%" stopColor="#FFA500" stopOpacity="0.4" />
                <Stop offset="100%" stopColor={BrandColors.terracotta600} stopOpacity="0.2" />
              </SvgGradient>
            </Defs>
            <Circle
              cx={swooshRadius}
              cy={swooshRadius}
              r={swooshRadius - 2}
              stroke="url(#swooshGradient)"
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${swooshRadius * 0.5} ${swooshRadius * 0.2}`}
            />
            <Circle
              cx={swooshRadius}
              cy={swooshRadius}
              r={swooshRadius - 10}
              stroke="url(#swooshGradient)"
              strokeWidth="2"
              fill="none"
              strokeDasharray={`${swooshRadius * 0.3} ${swooshRadius * 0.3}`}
              opacity="0.5"
            />
          </Svg>
        </Animated.View>

        {/* Main Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [
                { scale: Animated.multiply(logoInitialScale, finalLogoScale) }
              ],
              opacity: logoOpacity,
            }
          ]}
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
    backgroundColor: BrandColors.black,
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  blackScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BrandColors.black,
    zIndex: 1,
  },
  logoWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  swooshContainer: {
    position: 'absolute',
  },
  swooshSvg: {
    position: 'absolute',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AnimatedSplashScreen;