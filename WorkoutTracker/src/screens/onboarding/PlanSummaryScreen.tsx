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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Circle,
} from 'react-native-svg';
import { getPersonality } from '../../config/aiPersonalities';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PlanSummaryScreenProps {
  navigation?: any;
  selectedPersona?: string;
  userName?: string;
  userAge?: string;
  userWeight?: { currentWeight: number; targetWeight: number; unit: 'kg' | 'lb' };
  mainFocus?: string;
  experience?: string;
  trainingStyle?: string;
  workoutDays?: string[];
  workoutDuration?: number;
  injuries?: { injuries: string[]; customInjury?: string };
  onApplyPlan?: () => void;
  onSkipPlan?: () => void;
  onBack?: () => void;
}

const PlanSummaryScreen: React.FC<PlanSummaryScreenProps> = ({
  navigation,
  selectedPersona = 'calm',
  userName = 'Friend',
  userAge = '25',
  userWeight,
  mainFocus = 'Build Muscle',
  experience = 'Intermediate',
  trainingStyle = 'Gym',
  workoutDays = ['monday', 'wednesday', 'friday'],
  workoutDuration = 45,
  injuries = { injuries: ['none'] },
  onApplyPlan,
  onSkipPlan,
  onBack,
}) => {
  const [selectedDay, setSelectedDay] = useState(0);

  // Get AI personality for colors
  const personality = getPersonality(selectedPersona);

  // Animation refs
  const progressAnim = useRef(new Animated.Value(0.944)).current; // After Referral
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const chartPathAnim = useRef(new Animated.Value(0)).current;
  const chartFillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate progress bar to final step
    Animated.timing(progressAnim, {
      toValue: 1.0, // 100% - final step (18/18)
      duration: 420,
      useNativeDriver: false,
    }).start();

    // Animate content in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Animate chart after a delay
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(chartPathAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: false,
        }),
        Animated.timing(chartFillAnim, {
          toValue: 0.65,
          duration: 450,
          useNativeDriver: false,
        }),
      ]).start();
    }, 500);
  }, []);

  const getDayWorkout = (dayIndex: number) => {
    const workouts = [
      {
        title: 'Push',
        subtitle: 'Chest, shoulders, and triceps',
        exercises: [
          { name: 'Bench Press', sets: 4, reps: 8, weight: '65 lbs', rest: '90s' },
          { name: 'Dumbbell Shoulder Press', sets: 4, reps: 8, weight: '40 lbs', rest: '90s' },
          { name: 'Tricep Rope Pushdown', sets: 4, reps: 12, weight: '30 lbs', rest: '60s' },
          { name: 'Lateral Raises', sets: 3, reps: 15, weight: '15 lbs', rest: '60s' },
        ],
      },
      {
        title: 'Pull',
        subtitle: 'Back and biceps',
        exercises: [
          { name: 'Pull-ups', sets: 4, reps: 8, weight: 'BW', rest: '90s' },
          { name: 'Barbell Rows', sets: 4, reps: 10, weight: '85 lbs', rest: '90s' },
          { name: 'Cable Curls', sets: 4, reps: 12, weight: '40 lbs', rest: '60s' },
          { name: 'Face Pulls', sets: 3, reps: 15, weight: '25 lbs', rest: '60s' },
        ],
      },
      {
        title: 'Legs',
        subtitle: 'Quads, hamstrings, and glutes',
        exercises: [
          { name: 'Squats', sets: 4, reps: 8, weight: '135 lbs', rest: '120s' },
          { name: 'Romanian Deadlifts', sets: 4, reps: 10, weight: '95 lbs', rest: '90s' },
          { name: 'Leg Press', sets: 4, reps: 12, weight: '200 lbs', rest: '90s' },
          { name: 'Calf Raises', sets: 3, reps: 15, weight: '100 lbs', rest: '60s' },
        ],
      },
    ];
    return workouts[dayIndex];
  };

  const currentWorkout = getDayWorkout(selectedDay);

  // Safe weight access with defaults
  const safeUserWeight = userWeight || { currentWeight: 70, targetWeight: 65, unit: 'kg' as 'kg' | 'lb' };

  const getInjuriesDisplay = () => {
    if (injuries.injuries.includes('none')) return 'None';
    if (injuries.customInjury) return injuries.customInjury;
    return injuries.injuries.map(i => i.charAt(0).toUpperCase() + i.slice(1)).join(', ');
  };

  const getCardioFitness = () => {
    // Estimate based on workout frequency
    if (workoutDays.length >= 5) return 'High';
    if (workoutDays.length >= 3) return 'Moderate';
    return 'Low';
  };

  const getIntensity = () => {
    // Estimate based on experience and duration
    if (experience === 'Advanced' && workoutDuration >= 60) return 'High';
    if (experience === 'Beginner' || workoutDuration <= 30) return 'Low';
    return 'Moderate';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Header with Progress Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack || (() => navigation?.goBack())}
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
            onPress={onSkipPlan}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Headline */}
          <Text style={styles.headline}>
            {userName}, your plan is ready!
          </Text>
          <Text style={styles.subhead}>
            Designed around your goals & training style
          </Text>

          {/* Coach Message Card */}
          <View style={styles.coachRow}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              {(() => {
                const orbImages = {
                  'calm': require('../../../assets/images/calmOrb.png'),
                  'clear': require('../../../assets/images/clearOrb.png'),
                  'gentle': require('../../../assets/images/gentleOrb.png'),
                  'motivational': require('../../../assets/images/motivationalOrb.png'),
                };

                return (
                  <Image
                    source={orbImages[selectedPersona] || orbImages['calm']}
                    style={styles.avatarOrb}
                  />
                );
              })()}
            </View>

            {/* Message Card */}
            <View style={styles.coachCard}>
              <Text style={styles.coachLabel}>Coach</Text>
              <Text style={styles.coachMessage}>
                Great! Using all the information you've given me, I've put together this plan for you.
                Based on your target weight, I think we should aim for a 12 week plan, where you can
                expect to be around the weight you want to be, given you follow a good diet of course ;)!
              </Text>
            </View>
          </View>

          {/* Your Outline Section */}
          <Text style={styles.sectionHeader}>Your outline</Text>
          <View style={styles.outlineCard}>
            <View style={styles.outlineGrid}>
              <View style={styles.outlineItem}>
                <Text style={styles.outlineLabel}>Goal</Text>
                <Text style={styles.outlineValue}>{mainFocus}</Text>
              </View>
              <View style={styles.outlineItem}>
                <Text style={styles.outlineLabel}>Age</Text>
                <Text style={styles.outlineValue}>{userAge}</Text>
              </View>
              <View style={styles.outlineItem}>
                <Text style={styles.outlineLabel}>Fitness level</Text>
                <Text style={styles.outlineValue}>{experience}</Text>
              </View>
              <View style={styles.outlineItem}>
                <Text style={styles.outlineLabel}>Training style</Text>
                <Text style={styles.outlineValue}>{trainingStyle}</Text>
              </View>
              <View style={styles.outlineItem}>
                <Text style={styles.outlineLabel}>Weight</Text>
                <Text style={styles.outlineValue}>
                  {safeUserWeight.currentWeight} {safeUserWeight.unit}
                </Text>
              </View>
              <View style={styles.outlineItem}>
                <Text style={styles.outlineLabel}>Cardio Fitness</Text>
                <Text style={styles.outlineValue}>{getCardioFitness()}</Text>
              </View>
              <View style={styles.outlineItem}>
                <Text style={styles.outlineLabel}>Optimal intensity</Text>
                <Text style={styles.outlineValue}>{getIntensity()}</Text>
              </View>
              <View style={styles.outlineItem}>
                <Text style={styles.outlineLabel}>Injuries</Text>
                <Text style={styles.outlineValue}>{getInjuriesDisplay()}</Text>
              </View>
            </View>
          </View>

          {/* Goal Weight Chart */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Goal weight chart</Text>
            <Text style={styles.chartSubtitle}>Body weight progression according to plan</Text>

            {/* Simplified Chart Visualization */}
            <View style={styles.chartContainer}>
              <View style={styles.chartGrid}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={styles.gridLine} />
                ))}
              </View>

              {/* Weight Progression Line */}
              {(() => {
                const weightDiff = safeUserWeight.targetWeight - safeUserWeight.currentWeight;
                const isWeightLoss = weightDiff < 0;
                const maxWeight = Math.max(safeUserWeight.currentWeight, safeUserWeight.targetWeight);
                const minWeight = Math.min(safeUserWeight.currentWeight, safeUserWeight.targetWeight);
                const range = Math.max(Math.abs(weightDiff), 10); // Ensure minimum range

                // Calculate Y positions (inverted - higher weight = lower position)
                const startY = 140 - ((safeUserWeight.currentWeight - minWeight) / range * 100);
                const endY = 140 - ((safeUserWeight.targetWeight - minWeight) / range * 100);

                return (
                  <>
                    <Svg
                      style={StyleSheet.absoluteFillObject}
                      width={SCREEN_WIDTH - 48}
                      height={180}
                      viewBox={`0 0 ${SCREEN_WIDTH - 48} 180`}
                    >
                      <Defs>
                        <SvgLinearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <Stop offset="0%" stopColor={personality.progressBarColor} stopOpacity="0.8" />
                          <Stop offset="100%" stopColor={personality.progressBarColor} stopOpacity="1" />
                        </SvgLinearGradient>
                        <SvgLinearGradient id="fillGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <Stop offset="0%" stopColor={personality.progressBarColor} stopOpacity="0.3" />
                          <Stop offset="100%" stopColor={personality.progressBarColor} stopOpacity="0.05" />
                        </SvgLinearGradient>
                      </Defs>

                      {/* Fill area under the line */}
                      <Path
                        d={`
                          M 20 ${startY}
                          L ${SCREEN_WIDTH - 68} ${endY}
                          L ${SCREEN_WIDTH - 68} 180
                          L 20 180
                          Z
                        `}
                        fill="url(#fillGradient)"
                      />

                      {/* Progress line */}
                      <Path
                        d={`
                          M 20 ${startY}
                          L ${SCREEN_WIDTH - 68} ${endY}
                        `}
                        stroke="url(#lineGradient)"
                        strokeWidth="3"
                        fill="none"
                      />

                      {/* Weight point circles */}
                      <Circle
                        cx="20"
                        cy={startY}
                        r="6"
                        fill={personality.progressBarColor}
                      />
                      <Circle
                        cx={SCREEN_WIDTH - 68}
                        cy={endY}
                        r="6"
                        fill={personality.progressBarColor}
                      />
                    </Svg>

                    {/* Weight Points Labels */}
                    <View style={styles.weightPointsContainer}>
                      {/* Current Weight Point (start) */}
                      <View style={[
                        styles.weightPoint,
                        {
                          left: -5, // Center over the start point at x=20
                          top: startY - 25,
                          width: 50,
                          alignItems: 'center',
                        }
                      ]}>
                        <Text style={styles.weightPointLabel}>
                          {safeUserWeight.currentWeight}{safeUserWeight.unit}
                        </Text>
                      </View>

                      {/* Target Weight Point (end) */}
                      <View style={[
                        styles.weightPoint,
                        {
                          left: SCREEN_WIDTH - 93, // Position from left: screen width - 68 (end x) - 25 (half width for centering)
                          top: endY - 25,
                          width: 50,
                          alignItems: 'center',
                        }
                      ]}>
                        <Text style={styles.weightPointLabel}>
                          {safeUserWeight.targetWeight}{safeUserWeight.unit}
                        </Text>
                      </View>
                    </View>
                  </>
                );
              })()}
            </View>

            {/* X-axis labels */}
            <View style={styles.chartLabels}>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month) => (
                <Text key={month} style={styles.chartLabel}>{month}</Text>
              ))}
            </View>

            {/* Trend Info */}
            <View style={styles.trendContainer}>
              <View style={styles.trendRow}>
                <Ionicons
                  name="trending-down"
                  size={16}
                  color={personality.progressBarColor}
                />
                <Text style={styles.trendText}>
                  Trending {safeUserWeight.targetWeight < safeUserWeight.currentWeight ? 'down' : 'up'} by{' '}
                  {Math.abs(((safeUserWeight.targetWeight - safeUserWeight.currentWeight) / safeUserWeight.currentWeight) * 100).toFixed(1)}% in 12 weeks
                </Text>
              </View>
              <Text style={styles.trendDate}>January – April 2025</Text>
            </View>
          </View>

          {/* Weekly Plan */}
          <Text style={styles.sectionHeader}>Weekly plan</Text>
          <View style={styles.dayChipsRow}>
            {[0, 1, 2].map((dayIndex) => (
              <TouchableOpacity
                key={dayIndex}
                style={[
                  styles.dayChip,
                  selectedDay === dayIndex && styles.dayChipSelected,
                ]}
                onPress={() => setSelectedDay(dayIndex)}
                activeOpacity={0.9}
              >
                <View style={styles.dayChipContent}>
                  <Text style={styles.dayChipLabel}>Day {dayIndex + 1}</Text>
                  <Text style={styles.dayChipTitle}>{getDayWorkout(dayIndex).title}</Text>
                </View>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={selectedDay === dayIndex ? '#FFFFFF' : '#C8C8C8'}
                  style={styles.dayChipIcon}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Day Detail Card */}
          <View style={styles.dayDetailCard}>
            <Text style={styles.dayDetailTitle}>
              Day {selectedDay + 1}: {currentWorkout.title}
            </Text>
            <Text style={styles.dayDetailSubtitle}>{currentWorkout.subtitle}</Text>

            <View style={styles.exerciseList}>
              {currentWorkout.exercises.map((exercise, index) => (
                <View key={index}>
                  {index > 0 && <View style={styles.exerciseDivider} />}
                  <View style={styles.exerciseItem}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseDetails}>
                      {exercise.sets}×{exercise.reps}  {exercise.weight}  {exercise.rest} rest
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* CTA Buttons */}
          <View style={styles.ctaContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onApplyPlan}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryButtonText}>Apply and Get Started</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onSkipPlan}
              activeOpacity={0.9}
            >
              <Text style={styles.secondaryButtonText}>Get Started Without Plan</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
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
  headline: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    color: '#FFFFFF',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  subhead: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: '#C8C8C8',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  coachRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 12,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0F0F0F',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOrb: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  coachCard: {
    flex: 1,
    backgroundColor: '#121212',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 16,
  },
  coachLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: '#C8C8C8',
    marginBottom: 8,
  },
  coachMessage: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 24,
    color: '#EDEDED',
  },
  sectionHeader: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    color: '#FFFFFF',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  outlineCard: {
    marginHorizontal: 24,
    backgroundColor: '#121212',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 18,
    marginBottom: 24,
  },
  outlineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -12,
  },
  outlineItem: {
    width: '50%',
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  outlineLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    color: '#9A9A9A',
    marginBottom: 4,
  },
  outlineValue: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    color: '#FFFFFF',
  },
  chartCard: {
    marginHorizontal: 24,
    backgroundColor: '#121212',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 18,
    marginBottom: 24,
  },
  chartTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: '#C8C8C8',
    marginBottom: 16,
  },
  chartContainer: {
    height: 180,
    position: 'relative',
    marginBottom: 8,
  },
  chartGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-evenly',
  },
  gridLine: {
    height: 1,
    backgroundColor: '#2A2A2A',
    opacity: 0.4,
  },
  weightPointsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  weightPoint: {
    position: 'absolute',
    alignItems: 'center',
    top: '25%',
  },
  weightPointLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
    marginTop: 4,
    backgroundColor: '#121212',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  chartLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    color: '#9A9A9A',
  },
  trendContainer: {
    marginTop: 10,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  trendText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    color: '#FFFFFF',
  },
  trendDate: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: '#C8C8C8',
  },
  dayChipsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 16,
  },
  dayChip: {
    flex: 1,
    height: 64,
    backgroundColor: '#121212',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 12,
    position: 'relative',
  },
  dayChipSelected: {
    backgroundColor: '#1A1A1A',
    borderColor: '#FFFFFF',
    borderWidth: 1.5,
  },
  dayChipContent: {
    flex: 1,
  },
  dayChipLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    color: '#9A9A9A',
    marginBottom: 2,
  },
  dayChipTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
    color: '#FFFFFF',
  },
  dayChipIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  dayDetailCard: {
    marginHorizontal: 24,
    backgroundColor: '#121212',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 18,
    marginBottom: 24,
  },
  dayDetailTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  dayDetailSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: '#C8C8C8',
    marginBottom: 14,
  },
  exerciseList: {
    marginTop: 12,
  },
  exerciseDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 12,
  },
  exerciseItem: {
    paddingVertical: 8,
  },
  exerciseName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  exerciseDetails: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: '#C8C8C8',
  },
  ctaContainer: {
    paddingHorizontal: 24,
    gap: 12,
    paddingBottom: 24,
  },
  primaryButton: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9999,
    backgroundColor: '#E5E5E5',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
    color: '#000000',
  },
  secondaryButton: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9999,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  secondaryButtonText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
    color: '#FFFFFF',
  },
});

export default PlanSummaryScreen;