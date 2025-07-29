// src/screens/main/EditWorkoutScreen.tsx

import React, { useState, useEffect } from 'react';
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
import { useWorkoutSession } from '../../context/WorkoutSessionContext';

// Types for navigation
type EditWorkoutScreenProps = {
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
  muscle_groups?: string[]; // Add muscle_groups property
}

interface WorkoutTemplate {
  id?: string;
  name: string;
  exercises: Exercise[];
  estimated_duration?: number;
}

const EditWorkoutScreen: React.FC<EditWorkoutScreenProps> = ({ navigation, route }) => {
  // Get workout data from route params (null for new workout)
  const workoutData = route.params?.workout || null;
  const isNewWorkout = !workoutData;

  // Workout session context
  const { isWorkoutActive, workoutTime, startWorkoutSession, endWorkoutSession } = useWorkoutSession();

  const [workout, setWorkout] = useState<WorkoutTemplate>({
    id: workoutData?.id,
    name: workoutData?.name || 'New Workout',
    exercises: workoutData?.exercises || [],
    estimated_duration: workoutData?.estimated_duration || 0,
  });

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(workout.name);
  const [isSaving, setIsSaving] = useState(false);

  // Format time helper
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Save workout to database
  const saveWorkout = async (workoutToSave?: WorkoutTemplate) => {
    try {
      setIsSaving(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to save workouts');
        return null;
      }

      const workoutData = workoutToSave || workout;
      
      // Prepare exercises data for database (store as JSONB)
      const exercisesForDB = workoutData.exercises.map(exercise => ({
        id: exercise.id, // Unique instance ID
        original_exercise_id: exercise.original_exercise_id || exercise.id, // Keep reference to original
        name: exercise.name,
        duration_seconds: exercise.duration_seconds,
        sets_count: exercise.sets_count,
        reps_count: exercise.reps_count,
        muscle_groups: exercise.muscle_groups || [],
        sets: exercise.sets,
      }));

      const workoutPayload = {
        user_id: user.id,
        name: workoutData.name,
        description: `${workoutData.exercises.length} exercises`,
        exercises: exercisesForDB,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      let savedWorkout: any = null;

      if (workoutData.id) {
        // Update existing workout
        const { data, error } = await supabase
          .from('workout_templates')
          .update(workoutPayload)
          .eq('id', workoutData.id)
          .select()
          .single();

        if (error) throw error;
        savedWorkout = data;
      } else {
        // Create new workout
        const { data, error } = await supabase
          .from('workout_templates')
          .insert(workoutPayload)
          .select()
          .single();

        if (error) throw error;
        savedWorkout = data;
        
        // Update local state with the new ID
        setWorkout(prev => ({ ...prev, id: savedWorkout.id }));
      }

      console.log('Workout saved successfully');
      return savedWorkout;
    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Error', 'Failed to save workout. Please try again.');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Load workout data
  useEffect(() => {
    loadWorkoutData();
  }, [workoutData]);

  // Load previous exercise data for an exercise
  const loadPreviousExerciseData = async (originalExerciseId: string, setsCount: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get the most recent workout session that included this exercise
      const { data: recentSessions, error } = await supabase
        .from('workout_sessions')
        .select(`
          id,
          completed_at,
          workout_sets (
            set_number,
            weight,
            reps,
            exercise_id
          )
        `)
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(10); // Get last 10 sessions to search through

      if (error || !recentSessions) {
        console.log('No previous sessions found for exercise tracking');
        return [];
      }

      // Find the most recent session that has data for this exercise
      let previousSets: any[] = [];
      
      for (const session of recentSessions) {
        const exerciseSets = session.workout_sets?.filter((set: any) => 
          set.exercise_id === originalExerciseId
        ) || [];
        
        if (exerciseSets.length > 0) {
          previousSets = exerciseSets
            .sort((a: any, b: any) => a.set_number - b.set_number)
            .slice(0, setsCount); // Only get up to the number of sets in current workout
          break;
        }
      }

      return previousSets;
    } catch (error) {
      console.error('Error loading previous exercise data:', error);
      return [];
    }
  };

  // Load workout data with previous exercise records
  const loadWorkoutData = async () => {
    if (workoutData && workoutData.id) {
      // Load existing workout from database
      try {
        const { data, error } = await supabase
          .from('workout_templates')
          .select('*')
          .eq('id', workoutData.id)
          .single();

        if (error) {
          console.error('Error loading workout:', error);
          return;
        }

        if (data && data.exercises) {
          // Transform database exercises back to component format
          const transformedExercises = await Promise.all(
            data.exercises.map(async (exercise: any) => {
              const originalExerciseId = exercise.original_exercise_id || exercise.id;
              
              // Load previous exercise data for this exercise
              const previousSets = await loadPreviousExerciseData(originalExerciseId, exercise.sets_count);
              
              // Create sets with previous data if available
              const sets = [];
              for (let i = 1; i <= exercise.sets_count; i++) {
                const previousSet = previousSets.find((set: any) => set.set_number === i);
                sets.push({
                  id: `${exercise.id}-${i}`,
                  set_number: i,
                  weight: previousSet?.weight || undefined,
                  reps: previousSet?.reps || undefined,
                  completed: false, // Not completed in current session
                  is_previous: !!previousSet, // Mark as previous data if we found historical data
                });
              }

              return {
                id: exercise.id, // Use the unique instance ID from database
                original_exercise_id: originalExerciseId,
                name: exercise.name,
                duration_seconds: exercise.duration_seconds,
                sets_count: exercise.sets_count,
                reps_count: exercise.reps_count,
                has_unread_comments: false, // TODO: Load from comments table
                muscle_groups: exercise.muscle_groups,
                sets: sets,
              };
            })
          );

          setWorkout(prev => ({
            ...prev,
            exercises: transformedExercises,
            estimated_duration: Math.ceil(transformedExercises.length * 5),
          }));
        }
      } catch (error) {
        console.error('Error loading workout data:', error);
      }
    }
    // For new workouts (workoutData is null), don't load any sample data
    // Let the workout start completely empty
  };

  // Calculate exercise count and duration
  const exerciseCount = workout.exercises.length;
  const totalDuration = workout.estimated_duration || 0;

  // Handle title editing
  const handleTitlePress = () => {
    setIsEditingTitle(true);
    setTempTitle(workout.name);
  };

  const handleTitleSave = async () => {
    const newTitle = tempTitle.trim() || 'New Workout';
    const updatedWorkout = { ...workout, name: newTitle };
    setWorkout(updatedWorkout);
    setIsEditingTitle(false);
    
    // Save to database if workout has content
    if (workout.exercises.length > 0 || workout.id) {
      await saveWorkout(updatedWorkout);
    }
  };

  const handleTitleCancel = () => {
    setTempTitle(workout.name);
    setIsEditingTitle(false);
  };

  // Navigation handlers
  const handleBack = async () => {
    // Only save workout if it has content and a meaningful name
    if (workout.exercises.length > 0 && workout.name.trim() !== 'New Workout') {
      await saveWorkout();
    }
    navigation.goBack();
  };

  const handleSettings = () => {
    Alert.alert('Settings', 'Workout settings coming soon!');
  };

  const handleAddExercise = () => {
    navigation.navigate('ExerciseLibrary', {
      onExercisesSelected: async (selectedExercises: any[]) => {
        // Transform selected exercises to workout format with default 3 sets x 12 reps
        const newExercises = await Promise.all(
          selectedExercises.map(async (exercise, index) => {
            // Generate unique instance ID for each exercise (even if same exercise added multiple times)
            const uniqueInstanceId = `${exercise.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Load previous exercise data for this exercise
            const previousSets = await loadPreviousExerciseData(exercise.id, 3); // Default 3 sets
            
            // Create sets with previous data if available
            const sets = [];
            for (let i = 1; i <= 3; i++) {
              const previousSet = previousSets.find((set: any) => set.set_number === i);
              sets.push({
                id: `${uniqueInstanceId}-${i}`,
                set_number: i,
                weight: previousSet?.weight || undefined,
                reps: previousSet?.reps || undefined,
                completed: false,
                is_previous: !!previousSet, // Mark as previous data if found
              });
            }
            
            return {
              id: uniqueInstanceId, // Use unique instance ID instead of original exercise ID
              original_exercise_id: exercise.id, // Keep reference to original exercise
              name: exercise.name,
              duration_seconds: 60, // Default rest time
              sets_count: 3, // Default sets
              reps_count: 12, // Default reps
              has_unread_comments: false,
              muscle_groups: exercise.muscle_groups,
              sets: sets,
            };
          })
        );

        // Update workout state
        const updatedWorkout = {
          ...workout,
          exercises: [...workout.exercises, ...newExercises],
          estimated_duration: workout.estimated_duration! + (newExercises.length * 5), // Rough estimate
        };

        setWorkout(updatedWorkout);

        // Save to database
        const savedWorkout = await saveWorkout(updatedWorkout);
        if (savedWorkout) {
          Alert.alert('Success', `Added ${selectedExercises.length} exercise${selectedExercises.length > 1 ? 's' : ''} to workout!`);
        }
      }
    });
  };

  const handleStart = async () => {
    if (workout.exercises.length === 0) {
      Alert.alert('No Exercises', 'Please add some exercises before starting the workout.');
      return;
    }
    
    // Save the workout template first
    const savedWorkout = await saveWorkout();
    if (savedWorkout) {
      // Start workout session in context
      startWorkoutSession(savedWorkout);
      
      // Navigate to live workout session
      navigation.navigate('LiveWorkoutSession', { 
        workout: savedWorkout 
      });
    } else {
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    }
  };

  // Handle ending workout from edit screen
  const handleEndWorkout = () => {
    Alert.alert(
      'End Workout',
      'Are you sure you want to end the active workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'End Workout',
          style: 'destructive',
          onPress: () => {
            endWorkoutSession();
            Alert.alert('Workout Ended', 'Your workout has been saved.');
          }
        },
      ]
    );
  };

  // Exercise handlers
  const handleExerciseComments = (exercise: Exercise) => {
    Alert.alert('Comments', `Comments for ${exercise.name} coming soon!`);
  };

  const handleExerciseMenu = (exercise: Exercise) => {
    Alert.alert(
      exercise.name,
      'Choose an option:',
      [
        { 
          text: 'Edit Rest Time', 
          onPress: () => Alert.alert('Edit Rest Time', `Current: ${exercise.duration_seconds}s\n\nEditing coming soon!`) 
        },
        { 
          text: 'Edit Sets', 
          onPress: () => Alert.alert('Edit Sets', `Current: ${exercise.sets_count} sets\n\nEditing coming soon!`) 
        },
        { 
          text: 'Edit Reps', 
          onPress: () => Alert.alert('Edit Reps', `Current: ${exercise.reps_count} reps\n\nEditing coming soon!`) 
        },
        { 
          text: 'Remove Exercise', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Remove Exercise',
              `Are you sure you want to remove ${exercise.name}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Remove', 
                  style: 'destructive',
                  onPress: async () => {
                    const updatedWorkout = {
                      ...workout,
                      exercises: workout.exercises.filter(ex => ex.id !== exercise.id),
                    };
                    setWorkout(updatedWorkout);
                    
                    // Save to database
                    await saveWorkout(updatedWorkout);
                  }
                },
              ]
            );
          }
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleAddSet = async (exerciseId: string) => {
    const updatedWorkout = {
      ...workout,
      exercises: workout.exercises.map(exercise => {
        if (exercise.id === exerciseId) {
          const newSetNumber = exercise.sets.length + 1;
          
          // For new sets, try to load previous data if available
          const loadPreviousForNewSet = async () => {
            const originalExerciseId = exercise.original_exercise_id || exercise.id;
            const previousSets = await loadPreviousExerciseData(originalExerciseId, newSetNumber);
            const previousSet = previousSets.find((set: any) => set.set_number === newSetNumber);
            
            return {
              id: `${exerciseId}-${newSetNumber}`, // Use the unique exercise instance ID
              set_number: newSetNumber,
              weight: previousSet?.weight || undefined,
              reps: previousSet?.reps || undefined,
              completed: false,
              is_previous: !!previousSet,
            };
          };

          // For now, create the set without previous data (we'll improve this in the workout session)
          const newSet: ExerciseSet = {
            id: `${exerciseId}-${newSetNumber}`,
            set_number: newSetNumber,
            weight: undefined,
            reps: undefined,
            completed: false,
            is_previous: false,
          };
          
          return {
            ...exercise,
            sets: [...exercise.sets, newSet],
            sets_count: exercise.sets_count + 1,
          };
        }
        return exercise;
      }),
    };

    setWorkout(updatedWorkout);
    
    // Save to database
    await saveWorkout(updatedWorkout);
  };

  // Render exercise block
  const renderExercise = (exercise: Exercise) => (
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
              <TouchableOpacity
                style={styles.commentsButton}
                onPress={() => handleExerciseComments(exercise)}
              >
                <Ionicons name="chatbubble-outline" size={20} color="#000000" />
                {exercise.has_unread_comments && <View style={styles.unreadDot} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => handleExerciseMenu(exercise)}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#000000" />
              </TouchableOpacity>
            </View>
            <View style={styles.exerciseMetaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color="#6C6C6C" />
                <Text style={styles.metaText}>{exercise.duration_seconds || 0} secs</Text>
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
        {exercise.sets.map((set) => (
          <View key={set.id} style={styles.setRow}>
            <Text style={styles.setNumber}>{set.set_number}</Text>
            <Text style={[styles.setValue, set.is_previous && styles.previousValue]}>
              {set.weight || '-'}
            </Text>
            <Text style={[styles.setValue, set.is_previous && styles.previousValue]}>
              {set.reps || '-'}
            </Text>
            <View style={styles.checkColumn}>
              <Ionicons
                name={set.completed ? "checkmark-circle" : "ellipse-outline"}
                size={20}
                color={set.completed ? "#BFBFBF" : "#CCCCCC"}
              />
            </View>
          </View>
        ))}

        {/* Add Set Button */}
        <TouchableOpacity
          style={styles.addSetButton}
          onPress={() => handleAddSet(exercise.id)}
        >
          <Ionicons name="add" size={16} color="#000000" />
          <Text style={styles.addSetText}>Add Set</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
          {isEditingTitle ? (
            <View style={styles.titleEditContainer}>
              <TextInput
                style={styles.titleInput}
                value={tempTitle}
                onChangeText={setTempTitle}
                onBlur={handleTitleSave}
                onSubmitEditing={handleTitleSave}
                autoFocus
                maxLength={50}
              />
            </View>
          ) : (
            <TouchableOpacity onPress={handleTitlePress}>
              <Text style={styles.workoutTitle}>{workout.name}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Metadata */}
        <View style={styles.metadataRow}>
          <View style={styles.metadataItem}>
            <Ionicons name="link-outline" size={16} color="#6C6C6C" />
            <Text style={styles.metadataText}>{exerciseCount} exercises</Text>
          </View>
          <View style={styles.metadataItem}>
            <Ionicons name="time-outline" size={16} color="#6C6C6C" />
            <Text style={styles.metadataText}>{totalDuration} mins</Text>
          </View>
        </View>

        {/* Exercises List */}
        {workout.exercises.map(renderExercise)}

        {/* Add Exercise Button */}
        <TouchableOpacity style={styles.addExerciseButton} onPress={handleAddExercise}>
          <View style={styles.addExerciseIcon}>
            <Ionicons name="add" size={32} color="#17D4D4" />
          </View>
          <Text style={styles.addExerciseText}>Add Exercise</Text>
        </TouchableOpacity>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Start/End Button with Timer */}
      {isWorkoutActive ? (
        // Show End button with timer when workout is active
        <View style={styles.floatingWorkoutControls}>
          <View style={styles.workoutTimerSection}>
            <Text style={styles.timerText}>{formatTime(workoutTime)}</Text>
          </View>
          <TouchableOpacity style={styles.endButton} onPress={handleEndWorkout}>
            <Text style={styles.endButtonText}>End</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Show Start button when no workout is active
        <TouchableOpacity 
          style={[styles.floatingStartButton, isSaving && styles.floatingStartButtonDisabled]} 
          onPress={handleStart}
          disabled={isSaving}
        >
          <Text style={styles.startButtonText}>
            {isSaving ? 'Saving...' : 'Start'}
          </Text>
        </TouchableOpacity>
      )}
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
  titleEditContainer: {
    width: '100%',
  },
  titleInput: {
    fontSize: 22,
    fontFamily: 'Poppins-ExtraBold',
    color: '#000000',
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#17D4D4',
    paddingVertical: 4,
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
    marginHorizontal: 9,
  },
  metadataText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#6C6C6C',
    marginLeft: 6,
  },
  
  // Add Exercise Button
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  addExerciseIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DFFCFD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  addExerciseText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#666666',
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
    color: '#CCCCCC', // Light grey for previous attempt data
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  addSetText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#000000',
    marginLeft: 6,
  },
  
  // Floating Start Button (Original)
  floatingStartButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#17D4D4',
    borderRadius: 24,
    paddingHorizontal: 32,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 1000,
  },
  floatingStartButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  startButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  
  // Floating Workout Controls (New)
  floatingWorkoutControls: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 1000,
  },
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
  
  bottomSpacing: {
    height: 120, // Extra space so content doesn't hide behind floating button + tab bar
  },
});

export default EditWorkoutScreen;