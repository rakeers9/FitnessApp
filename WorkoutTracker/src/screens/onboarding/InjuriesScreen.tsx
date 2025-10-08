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
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getPersonality } from '../../config/aiPersonalities';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface InjuriesScreenProps {
  navigation?: any;
  selectedPersona?: string;
  onContinue?: (data: { injuries: string[]; customInjury?: string }) => void;
  onBack?: () => void;
  onSkip?: () => void;
}

const INJURY_OPTIONS = [
  { key: 'none', label: 'No injuries', icon: 'checkmark-circle-outline' },
  { key: 'lower_back', label: 'Lower back', icon: 'body-outline' },
  { key: 'knee', label: 'Knee', icon: 'body-outline' },
  { key: 'shoulder', label: 'Shoulder', icon: 'body-outline' },
  { key: 'neck', label: 'Neck', icon: 'body-outline' },
  { key: 'wrist', label: 'Wrist', icon: 'body-outline' },
  { key: 'ankle', label: 'Ankle', icon: 'body-outline' },
  { key: 'elbow', label: 'Elbow', icon: 'body-outline' },
  { key: 'hip', label: 'Hip', icon: 'body-outline' },
  { key: 'other', label: 'Other', icon: 'create-outline' },
];

const InjuriesScreen: React.FC<InjuriesScreenProps> = ({
  navigation,
  selectedPersona = 'calm',
  onContinue,
  onBack,
  onSkip,
}) => {
  const [selectedInjuries, setSelectedInjuries] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInjury, setCustomInjury] = useState('');

  // Get AI personality for progress bar color
  const personality = getPersonality(selectedPersona);

  // Animation refs
  const progressAnim = useRef(new Animated.Value(0.833)).current; // After Workout Duration
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;
  const customInputOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate progress bar to step 16
    Animated.timing(progressAnim, {
      toValue: 0.888, // ~88.8% for sixteenth step - Injuries (16/18)
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

  useEffect(() => {
    // Animate custom input visibility
    Animated.timing(customInputOpacity, {
      toValue: showCustomInput ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showCustomInput]);

  const toggleInjury = (injuryKey: string) => {
    if (injuryKey === 'none') {
      // If selecting "No injuries", clear all other selections
      setSelectedInjuries(['none']);
      setShowCustomInput(false);
      setCustomInjury('');
    } else if (injuryKey === 'other') {
      // Toggle "Other" and show/hide custom input
      if (selectedInjuries.includes('other')) {
        setSelectedInjuries(prev => prev.filter(i => i !== 'other'));
        setShowCustomInput(false);
        setCustomInjury('');
      } else {
        setSelectedInjuries(prev => [...prev.filter(i => i !== 'none'), 'other']);
        setShowCustomInput(true);
      }
    } else {
      // Toggle regular injury options
      setSelectedInjuries(prev => {
        const newInjuries = prev.includes(injuryKey)
          ? prev.filter(i => i !== injuryKey)
          : [...prev.filter(i => i !== 'none'), injuryKey];

        // If no injuries are selected, default to "none"
        return newInjuries.length === 0 ? ['none'] : newInjuries;
      });
    }
  };

  const handleContinue = () => {
    if (onContinue) {
      const data: { injuries: string[]; customInjury?: string } = {
        injuries: selectedInjuries,
      };

      if (selectedInjuries.includes('other') && customInjury.trim()) {
        data.customInjury = customInjury.trim();
      }

      onContinue(data);
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
    // Default to "No injuries" when skipping
    if (onContinue) {
      onContinue({ injuries: ['none'] });
    } else if (onSkip) {
      onSkip();
    }
  };

  const getInjuryCount = () => {
    if (selectedInjuries.includes('none')) return 'No injuries selected';
    if (selectedInjuries.length === 1) {
      if (selectedInjuries[0] === 'other' && customInjury.trim()) {
        return 'Custom injury specified';
      }
      return '1 area selected';
    }
    return `${selectedInjuries.length} areas selected`;
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
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: translateYAnim }],
            }}
          >
            {/* Title */}
            <Text style={styles.title}>Any injuries we should know about?</Text>

            {/* Subtitle */}
            <Text style={styles.subtitle}>
              We'll adapt your workouts to work around these areas
            </Text>

            {/* Injury Count */}
            <View style={styles.injuryCountContainer}>
              <Text style={styles.injuryCountText}>{getInjuryCount()}</Text>
            </View>

            {/* Injury Options */}
            <View style={styles.injuriesContainer}>
              {INJURY_OPTIONS.map((injury) => (
                <TouchableOpacity
                  key={injury.key}
                  style={[
                    styles.injuryButton,
                    selectedInjuries.includes(injury.key) && styles.injuryButtonSelected,
                  ]}
                  onPress={() => toggleInjury(injury.key)}
                  activeOpacity={0.9}
                >
                  <Text style={[
                    styles.injuryLabel,
                    selectedInjuries.includes(injury.key) && styles.injuryLabelSelected,
                  ]}>
                    {injury.label}
                  </Text>
                  {selectedInjuries.includes(injury.key) && (
                    <View style={styles.checkmarkContainer}>
                      <Ionicons name="checkmark" size={16} color="#000000" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Injury Input */}
            {showCustomInput && (
            <Animated.View
              style={[
                styles.customInputContainer,
                {
                  opacity: customInputOpacity,
                },
              ]}
            >
              <Text style={styles.customInputLabel}>
                Please describe your injury or condition:
              </Text>
              <TextInput
                style={styles.customInput}
                value={customInjury}
                onChangeText={setCustomInjury}
                placeholder="E.g., ACL recovery, tendinitis, chronic pain..."
                placeholderTextColor="#666666"
                multiline
                numberOfLines={3}
                maxLength={200}
              />
              <Text style={styles.characterCount}>
                {customInjury.length}/200
              </Text>
            </Animated.View>
            )}

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color="#9A9A9A" />
              <Text style={styles.infoText}>
                Your information is private and only used to personalize your workouts
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Continue Button */}
        <View style={styles.continueContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              selectedInjuries.length === 0 && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            activeOpacity={selectedInjuries.length > 0 ? 0.9 : 1}
            disabled={selectedInjuries.length === 0}
          >
            <Text
              style={[
                styles.continueButtonText,
                selectedInjuries.length === 0 && styles.continueButtonTextDisabled,
              ]}
            >
              Continue
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
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: '#C8C8C8',
    marginBottom: 24,
  },
  injuryCountContainer: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    marginBottom: 32,
  },
  injuryCountText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  injuriesContainer: {
    gap: 12,
    marginBottom: 24,
  },
  injuryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
  },
  injuryButtonSelected: {
    borderColor: '#FFFFFF',
    borderWidth: 1.5,
  },
  injuryLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  injuryLabelSelected: {
    fontFamily: 'DMSans_500Medium',
    fontWeight: '500',
  },
  checkmarkContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customInputContainer: {
    marginBottom: 24,
  },
  customInputLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    fontWeight: '400',
    color: '#9A9A9A',
    marginBottom: 8,
  },
  customInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: '#FFFFFF',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: '#666666',
    textAlign: 'right',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
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

export default InjuriesScreen;