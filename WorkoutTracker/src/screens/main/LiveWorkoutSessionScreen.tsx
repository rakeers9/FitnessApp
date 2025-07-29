// src/screens/main/LiveWorkoutSessionScreen.tsx

// ADD TO NAVIGATION: src/navigation/WorkoutStack.tsx
// Import: import LiveWorkoutSessionScreen from '../screens/main/LiveWorkoutSessionScreen';
// Add screen: <Stack.Screen name="LiveWorkoutSession" component={LiveWorkoutSessionScreen} />

// UPDATE EDITWORKOUTSCREEN: Change handleStart function to:
// navigation.navigate('LiveWorkoutSession', { workout: workoutToSave || workout });



import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { supabase } from '../../services/supabase';

// Types for navigation
type LiveWorkoutSessionScreenProps = {
  navigation: StackNavigationProp<any>;
  route: RouteProp<any>;
};

// Types for workout data
interface ExerciseSet {
  id: string;
  set_number: number;
  weight?: number;
  reps?: number;
  completed: boolean;
  is_previous?: boolean; // For showing previous attempt data
  is_current_session?: boolean; // For showing current session data in black
}

interface Exercise {
  id: string; // Unique instance ID
  original_exercise_id?: string; // Reference to original exercise in database
  name: string;
  duration_seconds?: number;
  sets_count: number;
  reps_count: number;
  sets: ExerciseSet[];
  has_unread_comments?: boolean;
  thumbnail_url?: string;
  muscle_groups?: string[];
}

interface WorkoutSession {
  id?: string;
  template_id?: string;
  workout_name: string;
  exercises: Exercise[];
  start_time: Date;
  current_exercise_index: number;
  current_set_index: number;
  total_duration: number; // in seconds
  is_rest_active: boolean;
  rest_remaining: number; // in seconds
}

const LiveWorkoutSessionScreen: React.FC<LiveWorkoutSessionScreenProps> = ({ navigation, route }) => {
  // Get workout template from route params
  const workoutTemplate = route.params?.workout;
  
  if (!workoutTemplate) {
    Alert.alert('Error', 'No workout data provided');
    navigation.goBack();
    return null;
  }

  // Workout session state
  const [session, setSession] = useState<WorkoutSession>({
    template_id: workoutTemplate.id,
    workout_name: workoutTemplate.name,
    exercises: workoutTemplate.exercises,
    start_time: new Date(),
    current_exercise_index: 0,
    current_set_index: 0,
    total_duration: 0,
    is_rest_active: false,
    rest_remaining: 0,
  });

  // Timer refs and states
  const workoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [workoutTime, setWorkoutTime] = useState(0); // Total workout time in seconds
  const [restTime, setRestTime] = useState(0); // Current rest time

  // Input states for current set
  const [currentWeight, setCurrentWeight] = useState('');
  const [currentReps, setCurrentReps] = useState('');

  // Initialize workout session
  useEffect(() => {
    startWorkoutSession();
    return () => {
      // Clean up timers when component unmounts
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, []);

  // Start the workout session
  const startWorkoutSession = async () => {
    try {
      // Create workout session in database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sessionData, error } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: user.id,
          template_id: workoutTemplate.id,
          workout_name: workoutTemplate.name,
          duration_minutes: 0, // Will update when workout ends
          total_volume: 0, // Will calculate when workout ends
          date_performed: new Date().toISOString().split('T')[0],
          // completed_at will be null until workout is finished
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating workout session:', error);
        return;
      }

      // Update session with database ID
      setSession(prev => ({ ...prev, id: sessionData.id }));

      // Start workout timer (updates every second)
      workoutTimerRef.current = setInterval(() => {
        setWorkoutTime(prev => prev + 1);
      }, 1000);

      console.log('Workout session started:', sessionData.id);
    } catch (error) {
      console.error('Error starting workout session:', error);
    }
  };

  // Format time display (MM:SS)
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get current exercise and set
  const getCurrentExercise = (): Exercise | null => {
    return session.exercises[session.current_exercise_index] || null;
  };

  const getCurrentSet = (): ExerciseSet | null => {
    const currentExercise = getCurrentExercise();
    if (!currentExercise) return null;
    return currentExercise.sets[session.current_set_index] || null;
  };

  // Handle set completion
  const completeCurrentSet = async () => {
    const weight = parseFloat(currentWeight) || 0;
    const reps = parseInt(currentReps) || 0;

    if (weight === 0 && reps === 0) {
      Alert.alert('Input Required', 'Please enter weight and reps for this set');
      return;
    }

    const currentExercise = getCurrentExercise();
    const currentSet = getCurrentSet();
    
    if (!currentExercise || !currentSet) return;

    try {
      // Save set to database
      if (session.id) {
        const { error } = await supabase
          .from('workout_sets')
          .insert({
            session_id: session.id,
            exercise_id: currentExercise.original_exercise_id || currentExercise.id,
            set_number: currentSet.set_number,
            weight: weight,
            reps: reps,
            rest_seconds: currentExercise.duration_seconds || 60,
          });

        if (error) {
          console.error('Error saving set:', error);
        }
      }

      // Update session state
      setSession(prev => {
        const updatedExercises = [...prev.exercises];
        const exerciseIndex = prev.current_exercise_index;
        const setIndex = prev.current_set_index;
        
        // Mark current set as completed and update with current session data
        updatedExercises[exerciseIndex].sets[setIndex] = {
          ...updatedExercises[exerciseIndex].sets[setIndex],
          weight: weight,
          reps: reps,
          completed: true,
          is_current_session: true,
        };

        // Find next set
        let nextExerciseIndex = exerciseIndex;
        let nextSetIndex = setIndex + 1;
        
        // If we've completed all sets for current exercise, move to next exercise
        if (nextSetIndex >= updatedExercises[exerciseIndex].sets.length) {
          nextExerciseIndex = exerciseIndex + 1;
          nextSetIndex = 0;
        }

        return {
          ...prev,
          exercises: updatedExercises,
          current_exercise_index: nextExerciseIndex,
          current_set_index: nextSetIndex,
          is_rest_active: true,
          rest_remaining: currentExercise.duration_seconds || 60,
        };
      });

      // Clear input fields
      setCurrentWeight('');
      setCurrentReps('');

      // Start rest timer
      startRestTimer(currentExercise.duration_seconds || 60);

    } catch (error) {
      console.error('Error completing set:', error);
      Alert.alert('Error', 'Failed to save set. Please try again.');
    }
  };

  // Start rest timer
  const startRestTimer = (restDuration: number) => {
    setRestTime(restDuration);
    
    restTimerRef.current = setInterval(() => {
      setRestTime(prev => {
        if (prev <= 1) {
          // Rest timer finished
          endRestPeriod();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // End rest period
  const endRestPeriod = () => {
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
    
    setSession(prev => ({
      ...prev,
      is_rest_active: false,
      rest_remaining: 0,
    }));
    
    setRestTime(0);
  };

  // Skip rest period
  const skipRest = () => {
    endRestPeriod();
  };

  // Adjust rest time
  const adjustRestTime = (seconds: number) => {
    setRestTime(prev => Math.max(0, prev + seconds));
    setSession(prev => ({
      ...prev,
      rest_remaining: Math.max(0, prev.rest_remaining + seconds),
    }));
  };

  // Handle workout end
  const endWorkout = async () => {
    Alert.alert(
      'End Workout',
      'Are you sure you want to end this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'End Workout',
          style: 'destructive',
          onPress: async () => {
            await finishWorkoutSession();
            navigation.goBack();
          }
        },
      ]
    );
  };

  // Finish workout session
  const finishWorkoutSession = async () => {
    try {
      if (!session.id) return;

      // Stop timers
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
      if (restTimerRef.current) clearInterval(restTimerRef.current);

      // Calculate total volume
      const totalVolume = session.exercises.reduce((total, exercise) => {
        return total + exercise.sets.reduce((exerciseTotal, set) => {
          if (set.completed && set.weight && set.reps) {
            return exerciseTotal + (set.weight * set.reps);
          }
          return exerciseTotal;
        }, 0);
      }, 0);

      // Update workout session in database
      const { error } = await supabase
        .from('workout_sessions')
        .update({
          completed_at: new Date().toISOString(),
          duration_minutes: Math.ceil(workoutTime / 60),
          total_volume: totalVolume,
        })
        .eq('id', session.id);

      if (error) {
        console.error('Error finishing workout session:', error);
      }

      console.log('Workout session completed successfully');
    } catch (error) {
      console.error('Error finishing workout session:', error);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    Alert.alert(
      'Workout in Progress',
      'Your workout is still active. What would you like to do?',
      [
        { text: 'Continue Workout', style: 'cancel' },
        { 
          text: 'End Workout',
          style: 'destructive',
          onPress: () => endWorkout()
        },
      ]
    );
  };

  // Handle settings
  const handleSettings = () => {
    Alert.alert('Settings', 'Workout settings coming soon!');
  };

  // Render exercise block
  const renderExercise = (exercise: Exercise, exerciseIndex: number) => {
    const isCurrentExercise = exerciseIndex === session.current_exercise_index;
    
    return (
      <View key={exercise.id} style={styles.exerciseBlock}>
        {/* Exercise Header */}
        <View style={styles.exerciseHeader}>
          <View style={styles.exerciseInfo}>
            <View style={[styles.exerciseThumbnail, styles.thumbnailPlaceholder]}>
              <Ionicons name="fitness" size={24} color="#17D4D4" />
            </View>
            <View style={styles.exerciseDetails}>
              <View style={styles.exerciseTitleRow}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <TouchableOpacity style={styles.commentsButton}>
                  <Ionicons name="chatbubble-outline" size={20} color="#000000" />
                  {exercise.has_unread_comments && <View style={styles.unreadDot} />}
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuButton}>
                  <Ionicons name="ellipsis-horizontal" size={20} color="#000000" />
                </TouchableOpacity>
              </View>
              <View style={styles.exerciseMetaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color="#6C6C6C" />
                  <Text style={styles.metaText}>{exercise.duration_seconds || 60} secs</Text>
                </View>
                <Text style={styles.metaText}>
                  {exercise.sets_count} sets x {exercise.reps_count} reps
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sets Table */}
        <View style={styles.setsTable}>
          {/* Table Headers */}
          <View style={styles.tableHeader}>
            <Text style={styles.columnHeader}>Set</Text>
            <Text style={styles.columnHeader}>Weight (kg)</Text>
            <Text style={styles.columnHeader}>Reps</Text>
            <View style={styles.checkColumn} />
          </View>

          {/* Set Rows */}
          {exercise.sets.map((set, setIndex) => {
            const isCurrentSet = isCurrentExercise && setIndex === session.current_set_index;
            const isCompletedInSession = set.completed && set.is_current_session;
            const isPreviousData = set.is_previous && !set.is_current_session;
            
            return (
              <View 
                key={set.id} 
                style={[
                  styles.setRow,
                  isCurrentSet && styles.currentSetRow // Light blue highlight
                ]}
              >
                <Text style={styles.setNumber}>{set.set_number}</Text>
                <Text style={[
                  styles.setValue,
                  isPreviousData && styles.previousValue, // Grey for previous
                  isCompletedInSession && styles.currentSessionValue // Black for current session
                ]}>
                  {set.weight || '-'}
                </Text>
                <Text style={[
                  styles.setValue,
                  isPreviousData && styles.previousValue, // Grey for previous
                  isCompletedInSession && styles.currentSessionValue // Black for current session
                ]}>
                  {set.reps || '-'}
                </Text>
                <View style={styles.checkColumn}>
                  <Ionicons
                    name={set.completed ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={isCompletedInSession ? "#17D4D4" : "#CCCCCC"} // Blue for completed current session
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* Current Set Input (only show for current exercise) */}
        {isCurrentExercise && session.current_set_index < exercise.sets.length && (
          <View style={styles.currentSetInput}>
            <Text style={styles.currentSetLabel}>
              Set {session.current_set_index + 1}
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Weight"
                placeholderTextColor="#AAAAAA"
                value={currentWeight}
                onChangeText={setCurrentWeight}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Reps"
                placeholderTextColor="#AAAAAA"
                value={currentReps}
                onChangeText={setCurrentReps}
                keyboardType="numeric"
              />
              <TouchableOpacity 
                style={styles.completeSetButton} 
                onPress={completeCurrentSet}
              >
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton} onPress={handleSettings}>
          <Ionicons name="settings-outline" size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Workout Title */}
        <View style={styles.titleSection}>
          <Text style={styles.workoutTitle}>{session.workout_name}</Text>
        </View>

        {/* Metadata */}
        <View style={styles.metadataRow}>
          <View style={styles.metadataItem}>
            <Ionicons name="link-outline" size={16} color="#6C6C6C" />
            <Text style={styles.metadataText}>{session.exercises.length} exercises</Text>
          </View>
          <View style={styles.metadataItem}>
            <Ionicons name="time-outline" size={16} color="#6C6C6C" />
            <Text style={styles.metadataText}>{Math.ceil(workoutTime / 60)} mins</Text>
          </View>
        </View>

        {/* Exercises List */}
        {session.exercises.map((exercise, index) => renderExercise(exercise, index))}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Bottom Timer & End Button */}
      <View style={styles.bottomContainer}>
        <View style={styles.timerContainer}>
          {session.is_rest_active ? (
            // Rest Timer
            <>
              <View style={styles.restTimerContent}>
                <Text style={styles.timerText}>{formatTime(restTime)}</Text>
                <TouchableOpacity 
                  style={styles.restAdjustButton} 
                  onPress={() => adjustRestTime(-15)}
                >
                  <Text style={styles.restAdjustText}>-15s</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.restAdjustButton} 
                  onPress={() => adjustRestTime(15)}
                >
                  <Text style={styles.restAdjustText}>+15s</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.skipButton} onPress={skipRest}>
                  <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            // Workout Timer + End Button
            <>
              <View style={styles.workoutTimerSection}>
                <Text style={styles.timerText}>{formatTime(workoutTime)}</Text>
              </View>
              <TouchableOpacity style={styles.endButton} onPress={endWorkout}>
                <Text style={styles.endButtonText}>End</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  headerButton: {
    padding: 4,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // Title Section
  titleSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  workoutTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-ExtraBold',
    color: '#000000',
    textAlign: 'center',
  },
  
  // Metadata
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  metadataText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#6C6C6C',
    marginLeft: 6,
  },
  
  // Exercise Blocks
  exerciseBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  exerciseHeader: {
    marginBottom: 16,
  },
  exerciseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  thumbnailPlaceholder: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseDetails: {
    flex: 1,
  },
  exerciseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  exerciseName: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    flex: 1,
  },
  commentsButton: {
    padding: 4,
    marginRight: 8,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B3B',
  },
  menuButton: {
    padding: 4,
  },
  exerciseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#6C6C6C',
    marginLeft: 4,
  },
  
  // Sets Table
  setsTable: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  columnHeader: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#6C6C6C',
    flex: 1,
    textAlign: 'center',
  },
  checkColumn: {
    width: 40,
    alignItems: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  currentSetRow: {
    backgroundColor: '#DFFCFD', // Light cyan highlight for current set
  },
  setNumber: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  setValue: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  previousValue: {
    color: '#AFAFAF', // Light grey for previous attempt data
  },
  currentSessionValue: {
    color: '#000000', // Black for current session data
    fontFamily: 'Poppins-SemiBold',
  },
  
  // Current Set Input
  currentSetInput: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F9F9FC',
    borderRadius: 12,
  },
  currentSetLabel: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  completeSetButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#17D4D4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Bottom Timer Container
  bottomContainer: {
    backgroundColor: '#F9F9FC',
    paddingBottom: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Workout Timer
  workoutTimerSection: {
    backgroundColor: '#0F1113',
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 48,
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  endButton: {
    backgroundColor: '#17D4D4',
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 24,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  
  // Rest Timer
  restTimerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1113',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 48,
  },
  restAdjustButton: {
    backgroundColor: '#17D4D4',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
  },
  restAdjustText: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  skipButton: {
    backgroundColor: '#17D4D4',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginLeft: 8,
  },
  skipButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  
  bottomSpacing: {
    height: 120, // Extra space for bottom container
  },
});

export default LiveWorkoutSessionScreen;