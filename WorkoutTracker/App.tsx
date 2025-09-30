import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  ImageBackground,
  Image,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import Logo from './src/components/Logo';
import PersonaSelectionScreen from './src/screens/onboarding/PersonaSelectionScreen';
import CoachIntroScreen from './src/screens/onboarding/CoachIntroScreen';
import MotivationScreen from './src/screens/onboarding/MotivationScreen';
import ChallengeScreen from './src/screens/onboarding/ChallengeScreen';
import ExperienceScreen from './src/screens/onboarding/ExperienceScreen';
import TrainingStyleScreen from './src/screens/onboarding/TrainingStyleScreen';
import MainFocusScreen from './src/screens/onboarding/MainFocusScreen';
import PrivacyConsentScreen from './src/screens/onboarding/PrivacyConsentScreen';
import AppleHealthScreen from './src/screens/onboarding/AppleHealthScreen';
import { OnboardingProvider } from './src/contexts/OnboardingContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Safe Area Wrapper Component - removed to use full screen

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showPersonaSelection, setShowPersonaSelection] = useState(false);
  const [showCoachIntro, setShowCoachIntro] = useState(false);
  const [showMotivation, setShowMotivation] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [showExperience, setShowExperience] = useState(false);
  const [showTrainingStyle, setShowTrainingStyle] = useState(false);
  const [showMainFocus, setShowMainFocus] = useState(false);
  const [showPrivacyConsent, setShowPrivacyConsent] = useState(false);
  const [showAppleHealth, setShowAppleHealth] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userAge, setUserAge] = useState<string>('');

  // Load DM Sans fonts
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  // Splash animations
  const splashOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  // Welcome screen animations
  const welcomeOpacity = useRef(new Animated.Value(0)).current;
  const phoneScale = useRef(new Animated.Value(0.92)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Splash screen animations
    Animated.parallel([
      Animated.timing(splashOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // Transition to welcome screen
    const timer = setTimeout(() => {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShowSplash(false);
        setShowWelcome(true);

        // Animate welcome screen in
        Animated.parallel([
          Animated.timing(welcomeOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(phoneScale, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(contentTranslateY, {
            toValue: 0,
            duration: 280,
            delay: 80,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!fontsLoaded || showSplash) {
    return (
      <SafeAreaProvider>
        <View style={styles.splashContainer}>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

          {/* Background with gradient */}
          <ImageBackground
            source={require('./assets/pinkdesert.jpg')}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)']}
              style={StyleSheet.absoluteFillObject}
            />
          </ImageBackground>

          {/* Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: splashOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Logo width={150} height={108} color="white" />
          </Animated.View>
        </View>
      </SafeAreaProvider>
    );
  }

  console.log('App state:', { showSplash, showWelcome, showPersonaSelection, showCoachIntro, showMotivation, showChallenge, showExperience, showTrainingStyle, showMainFocus, selectedPersona, userName });

  // Apple Health Screen
  if (showAppleHealth) {
    console.log('Rendering AppleHealthScreen');
    return (
      <SafeAreaProvider>
        <OnboardingProvider>
          <AppleHealthScreen
            selectedPersona={selectedPersona}
            userName={userName}
            userAge={userAge}
            onContinue={() => {
              console.log('Apple Health connected');
              // Navigate to next screen (Workout frequency, etc.)
            }}
            onBack={() => {
              setShowAppleHealth(false);
              setShowPrivacyConsent(true);
            }}
            onSkip={() => {
              console.log('Skipping Apple Health connection');
              // Navigate to next screen
            }}
          />
        </OnboardingProvider>
      </SafeAreaProvider>
    );
  }

  // Privacy Consent Screen
  if (showPrivacyConsent) {
    console.log('Rendering PrivacyConsentScreen');
    return (
      <SafeAreaProvider>
        <OnboardingProvider>
          <PrivacyConsentScreen
            selectedPersona={selectedPersona}
            userName={userName}
            userAge={userAge}
            onContinue={() => {
              console.log('Privacy consents accepted');
              setShowPrivacyConsent(false);
              setShowAppleHealth(true);
            }}
            onBack={() => {
              setShowPrivacyConsent(false);
              setShowMainFocus(true);
            }}
            onSkip={() => {
              console.log('Skipping privacy consent');
              setShowPrivacyConsent(false);
              setShowAppleHealth(true);
            }}
          />
        </OnboardingProvider>
      </SafeAreaProvider>
    );
  }

  // Main Focus Screen
  if (showMainFocus) {
    console.log('Rendering MainFocusScreen');
    return (
      <SafeAreaProvider>
        <OnboardingProvider>
          <MainFocusScreen
            selectedPersona={selectedPersona}
            userName={userName}
            userAge={userAge}
            onContinue={(focus) => {
              console.log('Main focus selected:', focus);
              setShowMainFocus(false);
              setShowPrivacyConsent(true);
            }}
            onBack={() => {
              setShowMainFocus(false);
              setShowTrainingStyle(true);
            }}
            onSkip={() => {
              console.log('Skipping main focus selection');
              setShowMainFocus(false);
              setShowPrivacyConsent(true);
            }}
          />
        </OnboardingProvider>
      </SafeAreaProvider>
    );
  }

  // Training Style Screen
  if (showTrainingStyle) {
    console.log('Rendering TrainingStyleScreen');
    return (
      <SafeAreaProvider>
        <OnboardingProvider>
          <TrainingStyleScreen
            selectedPersona={selectedPersona}
            userName={userName}
            userAge={userAge}
            onContinue={(style) => {
              console.log('Training style selected:', style);
              setShowTrainingStyle(false);
              setShowMainFocus(true);
            }}
            onBack={() => {
              setShowTrainingStyle(false);
              setShowExperience(true);
            }}
            onSkip={() => {
              console.log('Skipping training style selection');
              setShowTrainingStyle(false);
              setShowMainFocus(true);
            }}
          />
        </OnboardingProvider>
      </SafeAreaProvider>
    );
  }

  // Experience Screen
  if (showExperience) {
    console.log('Rendering ExperienceScreen');
    return (
      <SafeAreaProvider>
        <OnboardingProvider>
          <ExperienceScreen
            selectedPersona={selectedPersona}
            userName={userName}
            userAge={userAge}
            onContinue={(experience) => {
              console.log('Experience selected:', experience);
              setShowExperience(false);
              setShowTrainingStyle(true);
            }}
            onBack={() => {
              setShowExperience(false);
              setShowChallenge(true);
            }}
            onSkip={() => {
              console.log('Skipping experience selection');
              setShowExperience(false);
              setShowTrainingStyle(true);
            }}
          />
        </OnboardingProvider>
      </SafeAreaProvider>
    );
  }

  // Challenge Screen
  if (showChallenge) {
    console.log('Rendering ChallengeScreen');
    return (
      <SafeAreaProvider>
        <OnboardingProvider>
          <ChallengeScreen
            selectedPersona={selectedPersona}
            userName={userName}
            userAge={userAge}
            onContinue={(challenge) => {
              console.log('Challenge selected:', challenge);
              setShowChallenge(false);
              setShowExperience(true);
            }}
            onBack={() => {
              setShowChallenge(false);
              setShowMotivation(true);
            }}
            onSkip={() => {
              console.log('Skipping challenge selection');
              setShowChallenge(false);
              setShowExperience(true);
            }}
          />
        </OnboardingProvider>
      </SafeAreaProvider>
    );
  }

  // Motivation Screen
  if (showMotivation) {
    console.log('Rendering MotivationScreen');
    return (
      <SafeAreaProvider>
        <OnboardingProvider>
          <MotivationScreen
            selectedPersona={selectedPersona}
            userName={userName}
            userAge={userAge}
            onContinue={(motivation) => {
              console.log('Motivation selected:', motivation);
              setShowMotivation(false);
              setShowChallenge(true);
            }}
            onBack={() => {
              setShowMotivation(false);
              setShowCoachIntro(true);
            }}
            onSkip={() => {
              console.log('Skipping motivation selection');
              setShowMotivation(false);
              setShowChallenge(true);
            }}
          />
        </OnboardingProvider>
      </SafeAreaProvider>
    );
  }

  if (showCoachIntro) {
    console.log('Rendering CoachIntroScreen');
    return (
      <SafeAreaProvider>
        <OnboardingProvider>
          <CoachIntroScreen
            selectedPersona={selectedPersona}
            onContinue={(data) => {
              console.log('Name and Age collected:', data);
              setUserName(data.name);
              setUserAge(data.age);
              setShowCoachIntro(false);
              setShowMotivation(true);
            }}
            onBack={() => {
              setShowCoachIntro(false);
              setShowPersonaSelection(true);
            }}
          />
        </OnboardingProvider>
      </SafeAreaProvider>
    );
  }

  if (showPersonaSelection) {
    console.log('Rendering PersonaSelectionScreen');
    return (
      <SafeAreaProvider>
        <PersonaSelectionScreen
          onContinue={(persona) => {
            console.log('Persona selected:', persona);
            setSelectedPersona(persona);
            setShowPersonaSelection(false);
            setShowCoachIntro(true);
          }}
          onBack={() => {
            setShowPersonaSelection(false);
            setShowWelcome(true);
          }}
        />
      </SafeAreaProvider>
    );
  }

  if (showWelcome) {
    console.log('Rendering Welcome Screen');
    return (
      <SafeAreaProvider>
        <View style={styles.fullScreenContainer}>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
          <View style={styles.container}>

            {/* Phone Mockup Group */}
            <Animated.View
              style={[
                styles.heroGroup,
                {
                  opacity: welcomeOpacity,
                  transform: [{ scale: phoneScale }],
                },
              ]}
            >
              {/* Phone Image */}
              <View style={styles.phoneContainer}>
                <Image
                  source={require('./assets/images/welcome-phone.png')}
                  style={styles.phoneImage}
                  resizeMode="contain"
                />
              </View>

              {/* Gradient Overlay - fade from transparent to black */}
              <LinearGradient
                colors={[
                  'transparent',
                  'transparent',
                  'rgba(0, 0, 0, 0.3)',
                  'rgba(0, 0, 0, 0.7)',
                  '#000000',
                ]}
                locations={[0, 0.4, 0.6, 0.8, 1]}
                style={styles.phoneGradientOverlay}
              />
            </Animated.View>

            {/* Content Stack */}
            <Animated.View
              style={[
                styles.contentStack,
                {
                  opacity: welcomeOpacity,
                  transform: [{ translateY: contentTranslateY }],
                },
              ]}
            >
              <Text style={styles.title}>Welcome to App</Text>

              <View style={styles.subtitleContainer}>
                <Text style={styles.subtitle}>
                  Let's help you get started in reaching all your health and fitness goals
                </Text>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.9}
                onPress={() => {
                  console.log('Get started pressed - state changing now');
                  console.log('Current state:', { showWelcome, showPersonaSelection });
                  setShowWelcome(false);
                  setShowPersonaSelection(true);
                  console.log('State should change to persona selection');
                }}
              >
                <Text style={styles.primaryButtonText}>Get started</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.linkButton, { marginTop: -6 }]}
                activeOpacity={0.7}
                onPress={() => console.log('Sign in pressed')}
              >
                <Text style={styles.linkText}>Already have an account?</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </SafeAreaProvider>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  // Splash Screen Styles
  splashContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Welcome Screen Styles
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A', // Ensure full black background
  },
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  heroGroup: {
    position: 'absolute',
    top: 122,
    left: 56,
    right: 51,
    bottom: 301,
    overflow: 'hidden',
  },
  phoneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  phoneImage: {
    width: 320,
    height: 653,
  },
  phoneGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    width: 345,
    height: 467,
    alignSelf: 'center',
  },

  // Content Stack
  contentStack: {
    width: 345,
    alignItems: 'center',
    marginBottom: 34,
    gap: 12,
    zIndex: 10, // Ensure button is above the hero group
  },
  title: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 30,
    fontWeight: '500',
    lineHeight: 36,
    letterSpacing: -0.2,
    color: '#FAFAFA',
    textAlign: 'center',
  },
  subtitleContainer: {
    width: 303,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 24,
    color: '#A3A3A3',
    textAlign: 'center',
  },
  primaryButton: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 9999,
    backgroundColor: '#E5E5E5',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  primaryButtonText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: '#171717',
  },
  linkButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  linkText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 20,
    color: '#FAFAFA',
    textAlign: 'center',
  },
});