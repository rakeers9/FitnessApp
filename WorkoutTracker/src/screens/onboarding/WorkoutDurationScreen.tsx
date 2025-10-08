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
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getPersonality } from '../../config/aiPersonalities';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WorkoutDurationScreenProps {
  navigation?: any;
  selectedPersona?: string;
  onContinue?: (data: { workoutDuration: number }) => void;
  onBack?: () => void;
  onSkip?: () => void;
}

const WorkoutDurationScreen: React.FC<WorkoutDurationScreenProps> = ({
  navigation,
  selectedPersona = 'calm',
  onContinue,
  onBack,
  onSkip,
}) => {
  const [selectedDuration, setSelectedDuration] = useState(45); // Default 45 minutes
  const [sliderWidth, setSliderWidth] = useState(SCREEN_WIDTH);

  // Get AI personality for progress bar color
  const personality = getPersonality(selectedPersona);

  // Animation refs
  const progressAnim = useRef(new Animated.Value(0.777)).current; // After Workout Frequency
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  // Ref for scrolling
  const durationScrollRef = useRef<FlatList>(null);

  // Generate duration values (15 to 120 minutes in 5-minute increments)
  const minDuration = 15;
  const maxDuration = 120;
  const durationValues = Array.from(
    { length: (maxDuration - minDuration) / 5 + 1 },
    (_, i) => minDuration + i * 5
  );

  useEffect(() => {
    // Animate progress bar to step 15
    Animated.timing(progressAnim, {
      toValue: 0.833, // ~83.3% for fifteenth step - Workout Duration (15/18)
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

    // Scroll to default duration
    const index = durationValues.indexOf(selectedDuration);
    if (durationScrollRef.current && index >= 0) {
      setTimeout(() => {
        durationScrollRef.current?.scrollToIndex({ index, animated: false });
      }, 100);
    }
  }, []);

  const handleContinue = () => {
    if (onContinue) {
      onContinue({ workoutDuration: selectedDuration });
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

  const getItemLayout = (data: any, index: number) => ({
    length: 60,
    offset: 60 * index,
    index,
  });

  const renderDurationItem = ({ item, index }: { item: number; index: number }) => {
    const isSelected = item === selectedDuration;

    return (
      <TouchableOpacity
        style={[
          styles.durationItem,
          isSelected && styles.durationItemSelected,
        ]}
        onPress={() => setSelectedDuration(item)}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.durationText,
          isSelected && styles.durationTextSelected,
        ]}>
          {item}
        </Text>
        {isSelected && (
          <Text style={styles.minuteLabel}>min</Text>
        )}
      </TouchableOpacity>
    );
  };

  const getDurationDescription = () => {
    if (selectedDuration <= 30) return 'Quick and efficient';
    if (selectedDuration <= 45) return 'Perfect for most workouts';
    if (selectedDuration <= 60) return 'Good for comprehensive training';
    return 'Extended training session';
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
      <View style={styles.content}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: translateYAnim }],
          }}
        >
          {/* Title */}
          <Text style={styles.title}>How long can you workout?</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Set your maximum workout duration
          </Text>

          {/* Selected Duration Display */}
          <View style={styles.selectedDurationContainer}>
            <Text style={styles.selectedDurationValue}>{selectedDuration}</Text>
            <Text style={styles.selectedDurationUnit}>minutes</Text>
          </View>

          {/* Duration Description */}
          <Text style={styles.durationDescription}>{getDurationDescription()}</Text>

          {/* Duration Slider */}
          <View
            style={styles.sliderContainer}
            onLayout={(event) => {
              const { width } = event.nativeEvent.layout;
              setSliderWidth(width);
            }}
          >
            <View style={styles.selectionIndicator} />
            <FlatList
              ref={durationScrollRef}
              data={durationValues}
              renderItem={renderDurationItem}
              keyExtractor={(item) => item.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={60}
              decelerationRate="fast"
              contentContainerStyle={{
                paddingHorizontal: sliderWidth / 2 - 30,
              }}
              getItemLayout={getItemLayout}
              initialScrollIndex={durationValues.indexOf(selectedDuration)}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / 60);
                const selected = durationValues[index] || durationValues[0];
                setSelectedDuration(selected);
              }}
            />
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
          <Text style={styles.continueButtonText}>Continue</Text>
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
  selectedDurationContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 8,
  },
  selectedDurationValue: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 72,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 80,
  },
  selectedDurationUnit: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 24,
    fontWeight: '500',
    color: '#9A9A9A',
    marginLeft: 8,
  },
  durationDescription: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    fontWeight: '400',
    color: '#9A9A9A',
    textAlign: 'center',
    marginBottom: 40,
  },
  sliderContainer: {
    height: 100,
    position: 'relative',
  },
  selectionIndicator: {
    position: 'absolute',
    left: '50%',
    marginLeft: -30,
    width: 60,
    height: 100,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#E5E5E5',
    zIndex: 1,
    pointerEvents: 'none',
  },
  durationItem: {
    width: 60,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationItemSelected: {
    transform: [{ scale: 1.2 }],
  },
  durationText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 18,
    fontWeight: '400',
    color: '#666666',
  },
  durationTextSelected: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 24,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  minuteLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    fontWeight: '400',
    color: '#9A9A9A',
    marginTop: 2,
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

export default WorkoutDurationScreen;