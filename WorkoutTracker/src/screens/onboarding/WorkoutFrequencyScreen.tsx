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

interface WorkoutFrequencyScreenProps {
  navigation?: any;
  selectedPersona?: string;
  onContinue?: (data: { workoutDays: string[] }) => void;
  onBack?: () => void;
  onSkip?: () => void;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday', shortLabel: 'M' },
  { key: 'tuesday', label: 'Tuesday', shortLabel: 'T' },
  { key: 'wednesday', label: 'Wednesday', shortLabel: 'W' },
  { key: 'thursday', label: 'Thursday', shortLabel: 'T' },
  { key: 'friday', label: 'Friday', shortLabel: 'F' },
  { key: 'saturday', label: 'Saturday', shortLabel: 'S' },
  { key: 'sunday', label: 'Sunday', shortLabel: 'S' },
];

const WorkoutFrequencyScreen: React.FC<WorkoutFrequencyScreenProps> = ({
  navigation,
  selectedPersona = 'calm',
  onContinue,
  onBack,
  onSkip,
}) => {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // Get AI personality for progress bar color
  const personality = getPersonality(selectedPersona);

  // Animation refs
  const progressAnim = useRef(new Animated.Value(0.722)).current; // After Apple Health
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;
  const dayAnimations = useRef(
    DAYS_OF_WEEK.map(() => new Animated.Value(1))
  ).current;

  useEffect(() => {
    // Animate progress bar to step 14
    Animated.timing(progressAnim, {
      toValue: 0.777, // ~77.7% for fourteenth step - Workout Frequency (14/18)
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

  const toggleDay = (dayKey: string, index: number) => {
    // Animate the press
    Animated.sequence([
      Animated.timing(dayAnimations[index], {
        toValue: 0.95,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(dayAnimations[index], {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();

    setSelectedDays((prev) => {
      if (prev.includes(dayKey)) {
        return prev.filter((d) => d !== dayKey);
      } else {
        return [...prev, dayKey];
      }
    });
  };

  const handleContinue = () => {
    if (onContinue && selectedDays.length > 0) {
      onContinue({ workoutDays: selectedDays });
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

  const getDayCount = () => {
    if (selectedDays.length === 0) return 'No days selected';
    if (selectedDays.length === 1) return '1 day per week';
    if (selectedDays.length === 7) return 'Every day';
    return `${selectedDays.length} days per week`;
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
          {/* Title */}
          <Text style={styles.title}>When do you want to workout?</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Select the days you'll be available to train
          </Text>

          {/* Day Count */}
          <View style={styles.dayCountContainer}>
            <Text style={styles.dayCountText}>{getDayCount()}</Text>
          </View>

          {/* Days Grid */}
          <View style={styles.daysContainer}>
            {DAYS_OF_WEEK.map((day, index) => (
              <Animated.View
                key={day.key}
                style={{
                  transform: [{ scale: dayAnimations[index] }],
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.dayButton,
                    selectedDays.includes(day.key) && styles.dayButtonSelected,
                  ]}
                  onPress={() => toggleDay(day.key, index)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.dayLabel}>{day.label}</Text>
                  <View
                    style={[
                      styles.dayCircle,
                      selectedDays.includes(day.key) && styles.dayCircleSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayShortLabel,
                        selectedDays.includes(day.key) && styles.dayShortLabelSelected,
                      ]}
                    >
                      {day.shortLabel}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>

          {/* Quick Select Options */}
          <View style={styles.quickSelectContainer}>
            <TouchableOpacity
              style={styles.quickSelectButton}
              onPress={() => setSelectedDays(['monday', 'wednesday', 'friday'])}
              activeOpacity={0.7}
            >
              <Text style={styles.quickSelectText}>Mon, Wed, Fri</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickSelectButton}
              onPress={() => setSelectedDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])}
              activeOpacity={0.7}
            >
              <Text style={styles.quickSelectText}>Weekdays</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickSelectButton}
              onPress={() => setSelectedDays(DAYS_OF_WEEK.map(d => d.key))}
              activeOpacity={0.7}
            >
              <Text style={styles.quickSelectText}>Every day</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.continueContainer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            selectedDays.length === 0 && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          activeOpacity={selectedDays.length > 0 ? 0.9 : 1}
          disabled={selectedDays.length === 0}
        >
          <Text
            style={[
              styles.continueButtonText,
              selectedDays.length === 0 && styles.continueButtonTextDisabled,
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
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: '#C8C8C8',
    marginBottom: 24,
  },
  dayCountContainer: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    marginBottom: 32,
  },
  dayCountText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  daysContainer: {
    gap: 12,
    marginBottom: 32,
  },
  dayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
  },
  dayButtonSelected: {
    backgroundColor: '#2A2A2A',
    borderColor: '#FFFFFF',
    borderWidth: 1.5,
  },
  dayLabel: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleSelected: {
    backgroundColor: '#FFFFFF',
  },
  dayShortLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    fontWeight: '500',
    color: '#9A9A9A',
  },
  dayShortLabelSelected: {
    color: '#000000',
  },
  quickSelectContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  quickSelectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
  },
  quickSelectText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
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

export default WorkoutFrequencyScreen;