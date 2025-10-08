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

interface MotivationScreenProps {
  navigation?: any;
  selectedPersona?: string;
  userName?: string;
  userAge?: string;
  onContinue?: (motivation: string) => void;
  onBack?: () => void;
  onSkip?: () => void;
}

const MotivationScreen: React.FC<MotivationScreenProps> = ({
  navigation,
  selectedPersona = 'calm',
  userName,
  userAge,
  onContinue,
  onBack,
  onSkip,
}) => {
  const [selectedMotivation, setSelectedMotivation] = useState<string | null>(null);

  // Get AI personality for progress bar color
  const personality = getPersonality(selectedPersona);

  // Animation refs
  const progressAnim = useRef(new Animated.Value(0.166)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  const motivations = [
    { id: 'appearance', label: 'Appearance' },
    { id: 'health', label: 'Health' },
    { id: 'confidence', label: 'Confidence' },
    { id: 'performance', label: 'Performance' },
  ];

  useEffect(() => {
    // Animate progress bar to step 4 (name, age, persona, motivation)
    Animated.timing(progressAnim, {
      toValue: 0.388, // ~38.8% for seventh step - Training Inspiration (7/18)
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
    if (selectedMotivation && onContinue) {
      onContinue(selectedMotivation);
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

  const handleSelectMotivation = (motivationId: string) => {
    setSelectedMotivation(motivationId);
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
          {/* Question */}
          <Text style={styles.title}>What inspires you to train?</Text>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {motivations.map((motivation) => {
              const isSelected = selectedMotivation === motivation.id;
              return (
                <TouchableOpacity
                  key={motivation.id}
                  style={[
                    styles.optionButton,
                    isSelected && styles.optionButtonSelected,
                  ]}
                  onPress={() => handleSelectMotivation(motivation.id)}
                  activeOpacity={0.9}
                >
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                    ]}
                  >
                    {motivation.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.continueContainer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedMotivation && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          activeOpacity={selectedMotivation ? 0.9 : 1}
          disabled={!selectedMotivation}
        >
          <Text
            style={[
              styles.continueButtonText,
              !selectedMotivation && styles.continueButtonTextDisabled,
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
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  optionButtonSelected: {
    backgroundColor: '#E5E5E5',
    borderColor: 'transparent',
  },
  optionText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: '#FFFFFF',
  },
  optionTextSelected: {
    fontFamily: 'DMSans_500Medium',
    fontWeight: '500',
    color: '#0F0F0F',
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

export default MotivationScreen;