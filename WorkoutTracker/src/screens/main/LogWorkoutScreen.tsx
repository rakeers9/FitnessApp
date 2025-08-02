// src/screens/main/LogWorkoutScreen.tsx

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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { supabase } from '../../services/supabase';

// Types
type LogWorkoutScreenProps = {
  navigation: StackNavigationProp<any>;
  route: RouteProp<any>;
};

interface ExerciseSet {
  id: string;
  set_number: number;
  weight?: number;
  reps?: number;
  completed: boolean;
}

interface Exercise {
  id: string;
  original_exercise_id?: string;
  name: string;
  duration_seconds?: number;
  sets_count: number;
  reps_count: number;
  sets: ExerciseSet[];
  muscle_groups?: string[];
}

interface WorkoutTemplate {
  id?: string;
  name: string;
  exercises: Exercise[];
}

const LogWorkoutScreen: React.FC<LogWorkoutScreenProps> = ({ navigation, route }) => {
  // Get data from route params (with safe defaults)
  const { 
    workout: initialWorkout, 
    date, 
    dateDisplay, 
    isCustom = false
  } = route.params || {};

  const [workout, setWorkout] = useState<WorkoutTemplate>(initialWorkout || { id: 'temp', name: 'Workout', exercises: [] });
  const [sessionDuration, setSessionDuration] = useState('45'); // Default 45 minutes
  const [sessionNotes, setSessionNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  // Validation - redirect if missing required params
  useEffect(() => {
    if (!initialWorkout || !date || !dateDisplay) {
      Alert.alert('Error', 'Missing required parameters', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
  }, [initialWorkout, date, dateDisplay, navigation]);

  // State for set inputs
  const [setInputs, setSetInputs] = useState<{ [key: string]: { weight: string; reps: string } }>({});
  
  // NEW: State for previous workout data
  const [previousData, setPreviousData] = useState<{ [key: string]: { weight: number; reps: number } }>({});

  // Initialize set inputs
  useEffect(() => {
    const inputs: { [key: string]: { weight: string; reps: string } } = {};
    workout.exercises.forEach(exercise => {
      exercise.sets.forEach(set => {
        inputs[set.id] = {
          weight: set.weight?.toString() || '',
          reps: set.reps?.toString() || '',
        };
      });
    });
    setSetInputs(inputs);
    
    // Load previous workout data
    loadPreviousData();
  }, [workout.exercises]);

  // NEW: Load previous workout data for exercises
  const loadPreviousData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const exerciseIds = workout.exercises.map(ex => ex.original_exercise_id || ex.id);
      if (exerciseIds.length === 0) return;

      // FIXED: Get completed workout sessions first, then join with sets
      const { data: completedSessions, error: sessionError } = await supabase
        .from('workout_sessions')
        .select('id, date_performed, completed_at')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null) // Only completed workouts
        .lt('date_performed', date) // Only get data from before this date
        .order('date_performed', { ascending: false })
        .limit(20); // Get recent sessions

      if (sessionError) {
        console.error('Error loading sessions:', sessionError);
        return;
      }

      if (!completedSessions || completedSessions.length === 0) {
        console.log('No completed sessions found before this date');
        return;
      }

      const sessionIds = completedSessions.map(s => s.id);

      // Get workout sets for these sessions
      const { data: recentSets, error: setsError } = await supabase
        .from('workout_sets')
        .select('exercise_id, weight, reps, set_number, session_id')
        .in('exercise_id', exerciseIds)
        .in('session_id', sessionIds)
        .order('session_id', { ascending: false }) // Most recent sessions first
        .limit(100); // Get recent data

      if (setsError) {
        console.error('Error loading previous sets:', setsError);
        return;
      }

      if (recentSets && recentSets.length > 0) {
        // Group by exercise and get the most recent performance per set number
        const exerciseData: { [key: string]: { weight: number; reps: number } } = {};
        
        // For each exercise, find the most recent data for each set number
        exerciseIds.forEach(exerciseId => {
          const exerciseSets = recentSets.filter((set: any) => set.exercise_id === exerciseId);
          
          if (exerciseSets.length > 0) {
            // Sort by session order (most recent first) and take first occurrence of each set number
            const setsByNumber = new Map();
            exerciseSets.forEach((set: any) => {
              if (!setsByNumber.has(set.set_number)) {
                setsByNumber.set(set.set_number, set);
              }
            });
            
            // For simplicity, take the data from set 1 as representative
            const firstSet = setsByNumber.get(1);
            if (firstSet) {
              exerciseData[exerciseId] = {
                weight: firstSet.weight,
                reps: firstSet.reps,
              };
            }
          }
        });

        setPreviousData(exerciseData);
        console.log('Loaded previous data for', Object.keys(exerciseData).length, 'exercises');
      }
    } catch (error) {
      console.error('Error in loadPreviousData:', error);
    }
  };

  // Helper functions for set inputs
  const updateSetInput = (setId: string, field: 'weight' | 'reps', value: string) => {
    setSetInputs(prev => ({
      ...prev,
      [setId]: {
        ...prev[setId],
        [field]: value,
      }
    }));
  };

  const getSetInputValue = (setId: string, field: 'weight' | 'reps'): string => {
    return setInputs[setId]?.[field] || '';
  };

  // Navigation handlers
  const handleBack = () => {
    navigation.goBack();
  };

  // NEW: Handle adding exercises to workout
  const handleAddExercises = () => {
    navigation.navigate('ExerciseLibrary', {
      mode: 'add_to_log', // Special mode for adding to existing log
      currentWorkout: workout,
      date: date,
      dateDisplay: dateDisplay,
      onExercisesSelected: (selectedExercises: any[]) => {
        // Add new exercises to current workout
        const newExercises = selectedExercises.map((exercise, exerciseIndex) => {
          const exerciseInstanceId = `${exercise.id}-${Date.now()}-${exerciseIndex}-${Math.random().toString(36).substr(2, 9)}`;
          
          return {
            id: exerciseInstanceId,
            original_exercise_id: exercise.id,
            name: exercise.name,
            duration_seconds: 60, // Default rest time
            sets_count: 3, // Default sets
            reps_count: 12, // Default reps
            muscle_groups: exercise.muscle_groups,
            sets: [
              { 
                id: `${exerciseInstanceId}-set-1-${Date.now()}`, 
                set_number: 1, 
                weight: undefined, 
                reps: undefined, 
                completed: false 
              },
              { 
                id: `${exerciseInstanceId}-set-2-${Date.now()}`, 
                set_number: 2, 
                weight: undefined, 
                reps: undefined, 
                completed: false 
              },
              { 
                id: `${exerciseInstanceId}-set-3-${Date.now()}`, 
                set_number: 3, 
                weight: undefined, 
                reps: undefined, 
                completed: false 
              },
            ],
          };
        });

        setWorkout(prev => ({
          ...prev,
          exercises: [...prev.exercises, ...newExercises],
        }));
      },
    });
  };

  // Handle set completion toggle
  const toggleSetCompletion = (exerciseId: string, setId: string) => {
    const weightInput = getSetInputValue(setId, 'weight');
    const repsInput = getSetInputValue(setId, 'reps');
    const weight = parseFloat(weightInput) || 0;
    const reps = parseInt(repsInput) || 0;

    // Update the workout state
    setWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map(exercise => {
        if (exercise.id === exerciseId) {
          return {
            ...exercise,
            sets: exercise.sets.map(set => {
              if (set.id === setId) {
                return {
                  ...set,
                  weight: weight,
                  reps: reps,
                  completed: !set.completed,
                };
              }
              return set;
            }),
          };
        }
        return exercise;
      }),
    }));
  };

  // Add set to exercise
  const handleAddSet = (exerciseId: string) => {
    setWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map(exercise => {
        if (exercise.id === exerciseId) {
          const newSetNumber = exercise.sets.length + 1;
          const newSet: ExerciseSet = {
            id: `${exerciseId}-${newSetNumber}`,
            set_number: newSetNumber,
            weight: undefined,
            reps: undefined,
            completed: false,
          };
          
          return {
            ...exercise,
            sets: [...exercise.sets, newSet],
            sets_count: exercise.sets_count + 1,
          };
        }
        return exercise;
      }),
    }));
  };

  // Save workout log
  const handleSaveLog = async () => {
    try {
      setIsSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to save workout logs');
        return;
      }

      // Validate that at least one set is completed
      const hasCompletedSets = workout.exercises.some(exercise =>
        exercise.sets.some(set => set.completed)
      );

      if (!hasCompletedSets) {
        Alert.alert('No Sets Completed', 'Please complete at least one set before saving');
        return;
      }

      // Calculate total volume
      const totalVolume = workout.exercises.reduce((total, exercise) => {
        return total + exercise.sets.reduce((exerciseTotal, set) => {
          if (set.completed && set.weight && set.reps) {
            return exerciseTotal + (set.weight * set.reps);
          }
          return exerciseTotal;
        }, 0);
      }, 0);

      // Create workout session
      const { data: sessionData, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: user.id,
          template_id: isCustom ? null : workout.id,
          workout_name: workout.name,
          duration_minutes: parseInt(sessionDuration) || 45,
          total_volume: Math.round(totalVolume),
          date_performed: date,
          completed_at: new Date().toISOString(),
          notes: sessionNotes.trim() || null,
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Error creating session:', sessionError);
        Alert.alert('Error', 'Failed to save workout session');
        return;
      }

      // Save individual sets
      const setsToSave = [];
      for (const exercise of workout.exercises) {
        for (const set of exercise.sets) {
          if (set.completed && set.weight && set.reps) {
            setsToSave.push({
              session_id: sessionData.id,
              exercise_id: exercise.original_exercise_id || exercise.id,
              set_number: set.set_number,
              weight: set.weight,
              reps: set.reps,
              rest_seconds: exercise.duration_seconds || 60,
            });
          }
        }
      }

      if (setsToSave.length > 0) {
        const { error: setsError } = await supabase
          .from('workout_sets')
          .insert(setsToSave);

        if (setsError) {
          console.error('Error saving sets:', setsError);
          // Don't fail completely, session is already saved
        }
      }

      console.log('Workout log saved successfully');
      setShowCompleteModal(true);

    } catch (error) {
      console.error('Error in handleSaveLog:', error);
      Alert.alert('Error', 'Failed to save workout log. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // UPDATED: Handle completion modal close - fix navigation
  const handleCompleteSave = () => {
    setShowCompleteModal(false);
    
    // Navigate directly back to Profile screen
    navigation.navigate('MainTabs', { 
      screen: 'Profile',
      // This ensures we go directly to Profile without WorkoutLogs in the stack
    });
  };

  // Calculate stats
  const completedSets = workout.exercises.reduce((total, exercise) => 
    total + exercise.sets.filter(set => set.completed).length, 0
  );
  const totalSets = workout.exercises.reduce((total, exercise) => 
    total + exercise.sets.length, 0
  );

  // Render exercise
  const renderExercise = (exercise: Exercise, exerciseIndex: number) => {
    return (
      <View key={exercise.id} style={styles.exerciseBlock}>
        {/* Exercise Header */}
        <View style={styles.exerciseHeader}>
          <View style={styles.exerciseInfo}>
            <View style={[styles.exerciseThumbnail, styles.thumbnailPlaceholder]}>
              <Ionicons name="fitness" size={24} color="#17D4D4" />
            </View>
            <View style={styles.exerciseDetails}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.exerciseMeta}>
                {exercise.sets_count} sets x {exercise.reps_count} reps
              </Text>
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
            const weightInput = getSetInputValue(set.id, 'weight');
            const repsInput = getSetInputValue(set.id, 'reps');
            
            // Get previous data for this exercise
            const exerciseId = exercise.original_exercise_id || exercise.id;
            const prevData = previousData[exerciseId];
            const weightPlaceholder = prevData?.weight ? prevData.weight.toString() : '-';
            const repsPlaceholder = prevData?.reps ? prevData.reps.toString() : '-';
            
            return (
              <View key={set.id} style={styles.setRow}>
                <Text style={styles.setNumber}>{set.set_number}</Text>
                
                {/* Weight Input */}
                <TextInput
                  style={[
                    styles.setInput,
                    set.completed && styles.completedSetInput,
                    // FIXED: Show black text when user has typed something
                    weightInput && styles.userInputText
                  ]}
                  value={weightInput}
                  onChangeText={(value) => updateSetInput(set.id, 'weight', value)}
                  placeholder={weightPlaceholder}
                  placeholderTextColor="#CCCCCC"
                  keyboardType="numeric"
                />
                
                {/* Reps Input */}
                <TextInput
                  style={[
                    styles.setInput,
                    set.completed && styles.completedSetInput,
                    // FIXED: Show black text when user has typed something
                    repsInput && styles.userInputText
                  ]}
                  value={repsInput}
                  onChangeText={(value) => updateSetInput(set.id, 'reps', value)}
                  placeholder={repsPlaceholder}
                  placeholderTextColor="#CCCCCC"
                  keyboardType="numeric"
                />
                
                {/* Checkbox */}
                <TouchableOpacity 
                  style={styles.checkColumn}
                  onPress={() => toggleSetCompletion(exercise.id, set.id)}
                >
                  <Ionicons
                    name={set.completed ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={set.completed ? "#17D4D4" : "#CCCCCC"}
                  />
                </TouchableOpacity>
              </View>
            );
          })}

          {/* Add Set Button */}
          <TouchableOpacity
            style={styles.addSetButton}
            onPress={() => handleAddSet(exercise.id)}
          >
            <Ionicons name="add" size={14} color="#7A7A7A" />
            <Text style={styles.addSetText}>Add Set</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={24} color="#000000" />
          </TouchableOpacity>
          {/* NEW: Add Exercise Button */}
          <TouchableOpacity style={styles.headerButton} onPress={handleAddExercises}>
            <Ionicons name="add" size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* Workout Title */}
        <View style={styles.titleSection}>
          <Text style={styles.dateText}>Logging for {dateDisplay}</Text>
          <Text style={styles.workoutTitle}>{workout.name}</Text>
        </View>

        {/* Progress */}
        <View style={styles.progressSection}>
          <Text style={styles.progressText}>
            {completedSets} of {totalSets} sets completed
          </Text>
        </View>

        {/* Session Details */}
        <View style={styles.sessionDetailsSection}>
          <Text style={styles.sectionTitle}>Session Details</Text>
          
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Duration (minutes)</Text>
            <TextInput
              style={styles.durationInput}
              value={sessionDuration}
              onChangeText={setSessionDuration}
              placeholder="45"
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={sessionNotes}
              onChangeText={setSessionNotes}
              placeholder="How did the workout feel?"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Exercises List */}
        {workout.exercises.map((exercise, index) => renderExercise(exercise, index))}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity 
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
          onPress={handleSaveLog}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Save Workout Log'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      <Modal
        visible={showCompleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.completeModal}>
            <Text style={styles.completeTitle}>🎉 Workout Logged!</Text>
            <Text style={styles.completeSubtitle}>
              Your workout has been saved successfully.
            </Text>
            <TouchableOpacity 
              style={styles.completeButton} 
              onPress={handleCompleteSave}
            >
              <Text style={styles.completeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
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
    marginBottom: 20,
  },
  dateText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#888888',
    marginBottom: 8,
  },
  workoutTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-ExtraBold',
    color: '#000000',
    textAlign: 'center',
  },
  
  // Progress Section
  progressSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#17D4D4',
  },
  
  // Session Details
  sessionDetailsSection: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    marginBottom: 16,
  },
  inputRow: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#666666',
    marginBottom: 8,
  },
  durationInput: {
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
  notesInput: {
    height: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    textAlignVertical: 'top',
  },
  
  // Exercise Blocks (similar to EditWorkout)
  exerciseBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
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
  exerciseName: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    marginBottom: 2,
  },
  exerciseMeta: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#6C6C6C',
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
    justifyContent: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
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
  setInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#888888', // UPDATED: Made default input text grey
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  userInputText: {
    color: '#000000', // Black text when user has typed something
    fontFamily: 'Poppins-Medium',
  },
  completedSetInput: {
    backgroundColor: '#DFFCFD',
    color: '#000000',
    fontFamily: 'Poppins-SemiBold',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  addSetText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#7A7A7A',
    marginLeft: 6,
  },
  
  // Save Button
  saveButtonContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  saveButton: {
    backgroundColor: '#17D4D4',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  completeModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  completeTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  completeSubtitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#6C6C6C',
    textAlign: 'center',
    marginBottom: 24,
  },
  completeButton: {
    backgroundColor: '#17D4D4',
    borderRadius: 28,
    paddingHorizontal: 48,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  completeButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  
  bottomSpacing: {
    height: 100, // Space for save button
  },
});

export default LogWorkoutScreen;