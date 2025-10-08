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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getPersonality } from '../../config/aiPersonalities';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PrivacyConsentScreenProps {
  navigation?: any;
  selectedPersona?: string;
  userName?: string;
  userAge?: string;
  onContinue?: () => void;
  onBack?: () => void;
  onSkip?: () => void;
}

const PrivacyConsentScreen: React.FC<PrivacyConsentScreenProps> = ({
  navigation,
  selectedPersona = 'calm',
  userName,
  userAge,
  onContinue,
  onBack,
  onSkip,
}) => {
  const [consent1Checked, setConsent1Checked] = useState(false);
  const [consent2Checked, setConsent2Checked] = useState(false);

  // Get AI personality for progress bar color
  const personality = getPersonality(selectedPersona);

  // Animation refs
  const progressAnim = useRef(new Animated.Value(0.444)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  const allConsentsChecked = consent1Checked && consent2Checked;

  useEffect(() => {
    // Animate progress bar to step 9
    Animated.timing(progressAnim, {
      toValue: 0.666, // ~66.6% for twelfth step - Privacy Consent (12/18)
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
    if (allConsentsChecked && onContinue) {
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


  const CheckBox = ({ checked, onPress }: { checked: boolean; onPress: () => void }) => (
    <TouchableOpacity
      style={[styles.checkbox, checked && styles.checkboxChecked]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {checked && <Ionicons name="checkmark" size={14} color="#0F0F0F" />}
    </TouchableOpacity>
  );

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
          <Text style={styles.title}>Your privacy matters to us</Text>

          {/* Shield Icon */}
          <View style={styles.shieldContainer}>
            <View style={styles.shield}>
              <Ionicons name="shield-outline" size={113} color="#FFFFFF" style={{ opacity: 0.7 }} />
            </View>
          </View>

          {/* Consent Options */}
          <View style={styles.consentContainer}>
            {/* First Consent */}
            <View style={styles.consentRow}>
              <CheckBox
                checked={consent1Checked}
                onPress={() => setConsent1Checked(!consent1Checked)}
              />
              <Text style={styles.consentText}>
                I agree to the processing of my health data for the app to function properly
              </Text>
            </View>

            {/* Second Consent */}
            <View style={styles.consentRow}>
              <CheckBox
                checked={consent2Checked}
                onPress={() => setConsent2Checked(!consent2Checked)}
              />
              <Text style={styles.consentText}>
                I agree to my information being used by the app's AI systems to personalize my experience
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.continueContainer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !allConsentsChecked && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          activeOpacity={allConsentsChecked ? 0.9 : 1}
          disabled={!allConsentsChecked}
        >
          <Text
            style={[
              styles.continueButtonText,
              !allConsentsChecked && styles.continueButtonTextDisabled,
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
    marginBottom: 40,
  },
  shieldContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 60,
  },
  shield: {
    width: 135,
    height: 135,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consentContainer: {
    gap: 16,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#5C5C5C',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#E5E5E5',
    borderColor: '#E5E5E5',
  },
  consentText: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: '#FFFFFF',
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

export default PrivacyConsentScreen;