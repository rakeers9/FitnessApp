import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WelcomeGetStartedScreenProps {
  navigation?: any;
  onGetStarted?: () => void;
  onSignIn?: () => void;
}

const WelcomeGetStartedScreen: React.FC<WelcomeGetStartedScreenProps> = ({
  navigation,
  onGetStarted,
  onSignIn,
}) => {
  const insets = useSafeAreaInsets();

  // Animation values
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.92)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    // Hero animation: opacity 0→1 (300ms) + scale 0.92→1.00 (400ms)
    Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(heroScale, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Content animation: opacity 0→1 + translateY 8→0 over 280ms (start 80ms after hero)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    }, 80);
  }, []);

  const handleGetStarted = () => {
    if (onGetStarted) {
      onGetStarted();
    } else if (navigation) {
      navigation.navigate('Onboarding');
    }
  };

  const handleSignIn = () => {
    if (onSignIn) {
      onSignIn();
    } else if (navigation) {
      navigation.navigate('SignIn');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Hero Group */}
      <Animated.View
        style={[
          styles.heroGroup,
          {
            opacity: heroOpacity,
            transform: [{ scale: heroScale }],
          },
        ]}
      >
        {/* Phone Mockup Placeholder */}
        <View style={styles.phoneContainer}>
          <View style={styles.phoneMockup}>
            {/* Phone frame */}
            <View style={styles.phoneFrame}>
              <View style={styles.phoneScreen} />
            </View>
          </View>
        </View>

        {/* Gradient Rectangle Overlay */}
        <LinearGradient
          colors={[
            'rgba(10, 10, 10, 0)',  // #0A0A0A with 0% opacity
            'rgba(0, 0, 0, 0)',      // Transparent at 55%
            '#000000',               // base/background at 100%
          ]}
          locations={[0, 0.55, 1]}
          style={styles.gradientOverlay}
        />
      </Animated.View>

      {/* Content Stack */}
      <Animated.View
        style={[
          styles.contentStack,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
            paddingBottom: insets.bottom + 22,
          },
        ]}
      >
        {/* Title */}
        <Text style={styles.title}>Welcome to App</Text>

        {/* Subtitle */}
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitle}>
            Let's help you get started in reaching all your health and fitness goals
          </Text>
        </View>

        {/* Get Started Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleGetStarted}
          activeOpacity={0.9}
        >
          <Text style={styles.primaryButtonText}>Get started</Text>
        </TouchableOpacity>

        {/* Sign In Link */}
        <TouchableOpacity
          style={styles.linkButton}
          onPress={handleSignIn}
          activeOpacity={0.7}
        >
          <Text style={styles.linkText}>Already have an account?</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // base/background
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  heroGroup: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.65,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneContainer: {
    width: 286,
    height: 584,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -15 }],
  },
  phoneMockup: {
    width: 260,
    height: 530,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneFrame: {
    width: 240,
    height: 510,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#666666',
    backgroundColor: '#1a1a1a',
    padding: 10,
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  phoneScreen: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 30,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: (SCREEN_WIDTH - 345) / 2,
    width: 345,
    height: 467,
  },
  contentStack: {
    width: 345,
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontFamily: 'Poppins-Medium',
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.2,
    color: '#FFFFFF', // base/foreground
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  subtitleContainer: {
    width: 303,
    marginTop: 12,
  },
  subtitle: {
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFFB8', // base/muted-foreground (72% white)
    textAlign: 'center',
  },
  primaryButton: {
    width: 345,
    minHeight: 56,
    backgroundColor: '#FFFFFF', // base/primary
    borderRadius: 9999, // Fully rounded pill
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    // Shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.2,
    color: '#000000', // base/primary-foreground
  },
  linkButton: {
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  linkText: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF', // base/foreground
    textAlign: 'center',
  },
});

export default WelcomeGetStartedScreen;