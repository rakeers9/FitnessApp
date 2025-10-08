import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getPersonality } from '../../config/aiPersonalities';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AppleHealthScreenProps {
  navigation?: any;
  selectedPersona?: string;
  userName?: string;
  userAge?: string;
  onContinue?: () => void;
  onBack?: () => void;
  onSkip?: () => void;
}

const AppleHealthScreen: React.FC<AppleHealthScreenProps> = ({
  navigation,
  selectedPersona = 'calm',
  userName,
  userAge,
  onContinue,
  onBack,
  onSkip,
}) => {
  const [isConnected, setIsConnected] = useState(false);

  // Get AI personality for progress bar color
  const personality = getPersonality(selectedPersona);

  // Animation refs
  const progressAnim = useRef(new Animated.Value(0.5)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Animate progress bar to step 10
    Animated.timing(progressAnim, {
      toValue: 0.722, // ~72.2% for thirteenth step - Apple Health (13/18)
      duration: 420,
      useNativeDriver: false,
    }).start();

    // Animate content in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleConnectAppleHealth = () => {
    // Simulate Apple Health permission request
    if (Platform.OS === 'ios') {
      Alert.alert(
        '"WorkoutTracker" would like to access Health',
        'This helps our AI understand and serve you better with personalized workout recommendations.',
        [
          {
            text: "Don't Allow",
            style: 'cancel',
            onPress: () => {
              setIsConnected(false);
            },
          },
          {
            text: 'Allow',
            onPress: () => {
              setIsConnected(true);
            },
          },
        ],
        { cancelable: false }
      );
    } else {
      // For Android or other platforms, just toggle the state
      setIsConnected(!isConnected);
    }
  };

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation) {
      navigation.goBack();
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Header with Back Button and Progress Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: personality.progressBarColor,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>

      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: translateYAnim }],
          }}
        >
          {/* Title */}
          <Text style={styles.title}>Connect with Apple Health</Text>

          {/* Supporting Text */}
          <Text style={styles.supportingText}>
            This is so our AI can help understand and serve you better
          </Text>

          {/* Apple Health Button */}
          <TouchableOpacity
            style={[
              styles.appleHealthButton,
              isConnected && styles.appleHealthButtonConnected,
            ]}
            onPress={handleConnectAppleHealth}
            activeOpacity={0.9}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name="heart"
                size={16}
                color="#FF2D55"
              />
            </View>
            <Text style={styles.appleHealthButtonText}>
              {isConnected ? 'Connected to Apple Health' : 'Connect with Apple Health'}
            </Text>
            {isConnected && (
              <Ionicons
                name="checkmark-circle"
                size={20}
                color="#2ECC71"
                style={styles.checkIcon}
              />
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.continueContainer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !isConnected && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          activeOpacity={isConnected ? 0.9 : 1}
          disabled={!isConnected}
        >
          <Text
            style={[
              styles.continueButtonText,
              !isConnected && styles.continueButtonTextDisabled,
            ]}
          >
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  progressBarContainer: {
    flex: 1,
    maxWidth: 280, // Fixed max width for consistent size
    alignSelf: 'center',
    marginHorizontal: 'auto',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#3A3A3A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  skipButton: {
    marginLeft: 12,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  skipText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: '#9A9A9A',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 100,
  },
  title: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 24,
    fontWeight: '500',
    lineHeight: 32,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  supportingText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: '#C8C8C8',
    marginBottom: 40,
  },
  appleHealthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
  },
  appleHealthButtonConnected: {
    borderColor: '#2ECC71',
    borderWidth: 1.5,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  appleHealthButtonText: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: '#FFFFFF',
  },
  checkIcon: {
    marginLeft: 8,
  },
  continueContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  continueButton: {
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
  continueButtonDisabled: {
    backgroundColor: '#5A5A5A',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: '#171717',
  },
  continueButtonTextDisabled: {
    color: '#9A9A9A',
  },
});

export default AppleHealthScreen;