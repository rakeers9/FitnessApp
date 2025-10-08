import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getPersonality } from '../../config/aiPersonalities';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ReferralCodeScreenProps {
  navigation?: any;
  selectedPersona?: string;
  onContinue?: (data: { referralCode?: string }) => void;
  onBack?: () => void;
  onSkip?: () => void;
}

const ReferralCodeScreen: React.FC<ReferralCodeScreenProps> = ({
  navigation,
  selectedPersona = 'calm',
  onContinue,
  onBack,
  onSkip,
}) => {
  const [referralCode, setReferralCode] = useState('');

  // Get AI personality for progress bar color
  const personality = getPersonality(selectedPersona);

  // Animation refs
  const progressAnim = useRef(new Animated.Value(0.888)).current; // After Injuries
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Animate progress bar to step 17
    Animated.timing(progressAnim, {
      toValue: 0.944, // ~94.4% for seventeenth step - Referral (17/18)
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


  const handleContinue = () => {
    if (onContinue) {
      onContinue({ referralCode: referralCode.trim() || undefined });
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation) {
      navigation.goBack();
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
  };

  const formatReferralCode = (text: string) => {
    // Convert to uppercase and remove spaces
    return text.toUpperCase().replace(/\s/g, '');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
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

          {/* Skip Button */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: translateYAnim }],
            }}
          >
            {/* Title */}
            <Text style={styles.title}>Have a referral code?</Text>

            {/* Subtitle */}
            <Text style={styles.subtitle}>
              Enter it below to unlock special benefits
            </Text>

            {/* Referral Code Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={referralCode}
                onChangeText={(text) => setReferralCode(formatReferralCode(text))}
                placeholder="ENTER CODE"
                placeholderTextColor="#666666"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={20}
                returnKeyType="done"
                onSubmitEditing={handleContinue}
              />
              {referralCode.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setReferralCode('')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={20} color="#666666" />
                </TouchableOpacity>
              )}
            </View>

            {/* Code Format Hint */}
            <Text style={styles.hint}>
              Codes are usually 6-10 characters
            </Text>

            {/* Benefits Info */}
            <View style={styles.benefitsContainer}>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#9A9A9A" />
                <Text style={styles.benefitText}>Extended free trial</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#9A9A9A" />
                <Text style={styles.benefitText}>Exclusive workouts</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#9A9A9A" />
                <Text style={styles.benefitText}>Priority support</Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Continue Button */}
        <View style={styles.continueContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.9}
          >
            <Text style={styles.continueButtonText}>
              {referralCode ? 'Apply Code' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardView: {
    flex: 1,
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  title: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 24,
    fontWeight: '500',
    lineHeight: 32,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: '#C8C8C8',
    marginBottom: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  hint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
    marginBottom: 48,
  },
  benefitsContainer: {
    gap: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    fontWeight: '400',
    color: '#9A9A9A',
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
  continueButtonText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: '#171717',
  },
});

export default ReferralCodeScreen;