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

interface WeightScreenProps {
  navigation?: any;
  selectedPersona?: string;
  userName?: string;
  userAge?: string;
  onContinue?: (data: { currentWeight: number; targetWeight: number; unit: 'kg' | 'lb' }) => void;
  onBack?: () => void;
}

const WeightScreen: React.FC<WeightScreenProps> = ({
  navigation,
  selectedPersona = 'calm',
  userName,
  userAge,
  onContinue,
  onBack,
}) => {
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg');
  const [currentWeight, setCurrentWeight] = useState(70); // Default 70kg
  const [targetWeight, setTargetWeight] = useState(65); // Default 65kg
  const [currentStep, setCurrentStep] = useState<'current' | 'target'>('current');
  const [sliderWidth, setSliderWidth] = useState(SCREEN_WIDTH);

  // Get AI personality for progress bar color
  const personality = getPersonality(selectedPersona);

  // Animation refs
  const progressAnim = useRef(new Animated.Value(0.166)).current; // After name/age
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  // Refs for scrolling
  const currentWeightScrollRef = useRef<FlatList>(null);
  const targetWeightScrollRef = useRef<FlatList>(null);

  // Generate weight values
  const minWeight = unit === 'kg' ? 30 : 66; // 30kg = 66lb
  const maxWeight = unit === 'kg' ? 200 : 440; // 200kg = 440lb
  const weightValues = Array.from(
    { length: maxWeight - minWeight + 1 },
    (_, i) => minWeight + i
  );

  useEffect(() => {
    // Animate progress bar to step 3 (right after CoachIntro name/age)
    Animated.timing(progressAnim, {
      toValue: 0.222, // ~22.2% for fourth step - Current Weight (4/18)
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

  // Scroll to the correct weight when switching between current and target
  useEffect(() => {
    const scrollRef = currentStep === 'current' ? currentWeightScrollRef : targetWeightScrollRef;
    const weight = currentStep === 'current' ? currentWeight : targetWeight;
    const index = weightValues.indexOf(weight);

    if (scrollRef.current && index >= 0) {
      setTimeout(() => {
        scrollRef.current?.scrollToIndex({ index, animated: false });
      }, 100);
    }
  }, [currentStep, currentWeight, targetWeight, weightValues]);

  // Convert weight when unit changes
  const convertWeight = (weight: number, fromUnit: 'kg' | 'lb', toUnit: 'kg' | 'lb') => {
    if (fromUnit === toUnit) return weight;
    if (fromUnit === 'kg' && toUnit === 'lb') {
      return Math.round(weight * 2.205);
    } else {
      return Math.round(weight / 2.205);
    }
  };

  const handleUnitToggle = (newUnit: 'kg' | 'lb') => {
    if (unit !== newUnit) {
      setCurrentWeight(convertWeight(currentWeight, unit, newUnit));
      setTargetWeight(convertWeight(targetWeight, unit, newUnit));
      setUnit(newUnit);
    }
  };

  const handleContinue = () => {
    if (currentStep === 'current') {
      setCurrentStep('target');
      // Update progress
      Animated.timing(progressAnim, {
        toValue: 0.277, // ~27.7% for fifth step - Target Weight (5/18)
        duration: 420,
        useNativeDriver: false,
      }).start();
    } else if (onContinue) {
      onContinue({ currentWeight, targetWeight, unit });
    }
  };

  const handleBack = () => {
    if (currentStep === 'target') {
      setCurrentStep('current');
      // Update progress back
      Animated.timing(progressAnim, {
        toValue: 0.222, // Back to current weight (4/18)
        duration: 420,
        useNativeDriver: false,
      }).start();
    } else if (onBack) {
      onBack();
    } else if (navigation) {
      navigation.goBack();
    }
  };


  const getItemLayout = (data: any, index: number) => ({
    length: 60,
    offset: 60 * index,
    index,
  });

  const renderWeightItem = ({ item, index }: { item: number; index: number }) => {
    const isSelected = currentStep === 'current'
      ? item === currentWeight
      : item === targetWeight;

    return (
      <TouchableOpacity
        style={[
          styles.weightItem,
          isSelected && styles.weightItemSelected,
        ]}
        onPress={() => {
          if (currentStep === 'current') {
            setCurrentWeight(item);
          } else {
            setTargetWeight(item);
          }
        }}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.weightText,
          isSelected && styles.weightTextSelected,
        ]}>
          {item}
        </Text>
        {isSelected && (
          <Text style={styles.unitLabel}>{unit}</Text>
        )}
      </TouchableOpacity>
    );
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
      <View style={styles.content}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: translateYAnim }],
          }}
        >
          {/* Title */}
          <Text style={styles.title}>
            {currentStep === 'current'
              ? "What's your current weight?"
              : "What's your target weight?"}
          </Text>

          {/* Unit Toggle */}
          <View style={styles.unitToggleContainer}>
            <TouchableOpacity
              style={[
                styles.unitButton,
                unit === 'kg' && styles.unitButtonActive,
              ]}
              onPress={() => handleUnitToggle('kg')}
              activeOpacity={0.9}
            >
              <Text style={[
                styles.unitButtonText,
                unit === 'kg' && styles.unitButtonTextActive,
              ]}>
                kg
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.unitButton,
                unit === 'lb' && styles.unitButtonActive,
              ]}
              onPress={() => handleUnitToggle('lb')}
              activeOpacity={0.9}
            >
              <Text style={[
                styles.unitButtonText,
                unit === 'lb' && styles.unitButtonTextActive,
              ]}>
                lb
              </Text>
            </TouchableOpacity>
          </View>

          {/* Weight Slider */}
          <View
            style={styles.sliderContainer}
            onLayout={(event) => {
              const { width } = event.nativeEvent.layout;
              setSliderWidth(width);
            }}
          >
            <View style={styles.selectionIndicator} />
            <FlatList
              ref={currentStep === 'current' ? currentWeightScrollRef : targetWeightScrollRef}
              data={weightValues}
              renderItem={renderWeightItem}
              keyExtractor={(item) => item.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={60}
              decelerationRate="fast"
              contentContainerStyle={{
                paddingHorizontal: sliderWidth / 2 - 30,
              }}
              getItemLayout={getItemLayout}
              initialScrollIndex={
                weightValues.indexOf(currentStep === 'current' ? currentWeight : targetWeight)
              }
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / 60);
                const selectedWeight = weightValues[index] || weightValues[0];
                if (currentStep === 'current') {
                  setCurrentWeight(selectedWeight);
                } else {
                  setTargetWeight(selectedWeight);
                }
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
          <Text style={styles.continueButtonText}>
            {currentStep === 'current' ? 'Next' : 'Continue'}
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
    marginBottom: 32,
  },
  unitToggleContainer: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 2,
    marginBottom: 40,
  },
  unitButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 6,
  },
  unitButtonActive: {
    backgroundColor: '#E5E5E5',
  },
  unitButtonText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  unitButtonTextActive: {
    color: '#0F0F0F',
  },
  selectedWeightContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 40,
  },
  selectedWeightValue: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 72,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 80,
  },
  selectedWeightUnit: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 24,
    fontWeight: '500',
    color: '#9A9A9A',
    marginLeft: 8,
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
  weightItem: {
    width: 60,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightItemSelected: {
    transform: [{ scale: 1.2 }],
  },
  weightText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 18,
    fontWeight: '400',
    color: '#666666',
  },
  weightTextSelected: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 24,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  unitLabel: {
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

export default WeightScreen;