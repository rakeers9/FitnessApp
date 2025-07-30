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
  Modal,
  KeyboardAvoidingView,
  Platform,
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
  is_current_session?: boolean; // For showing current session data in black
  original_previous_weight?: number; // Locked previous data from before workout started
  original_previous_reps?: number; // Locked previous data from before workout started
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
  const { 
    activeSession,
    isWorkoutActive, 
    workoutTime, 
    restTime,
    startWorkoutSession, 
    endWorkoutSession,
    updateSession,
    startRestTimer,
    endRestPeriod,
    adjustRestTime 
  } = useWorkoutSession();

  const [workout, setWorkout] = useState<WorkoutTemplate>({
    id: workoutData?.id,
    name: workoutData?.name || 'New Workout',
    exercises: workoutData?.exercises || [],
    estimated_duration: workoutData?.estimated_duration || 0,
  });

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(workout.name);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showWorkoutComplete, setShowWorkoutComplete] = useState(false);

  // State for directly editable set inputs - tracks weight/reps for each set
  const [setInputs, setSetInputs] = useState<{ [key: string]: { weight: string; reps: string } }>({});
  
  // State for active set (which set is currently being worked on)
  const [activeSetId, setActiveSetId] = useState<string | null>(null);

  // Format time helper
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Update set input values
  const updateSetInput = (setId: string, field: 'weight' | 'reps', value: string) => {
    setSetInputs(prev => ({
      ...prev,
      [setId]: {
        ...prev[setId],
        [field]: value,
      }
    }));
  };

  // Get current set input value
  const getSetInputValue = (setId: string, field: 'weight' | 'reps'): string => {
    return setInputs[setId]?.[field] || '';
  };

  // Apply all setInputs to workout state (preserves all user edits)
  const applySetInputsToWorkout = (currentWorkout: WorkoutTemplate): WorkoutTemplate => {
    return {
      ...currentWorkout,
      exercises: currentWorkout.exercises.map(exercise => ({
        ...exercise,
        sets: exercise.sets.map(set => {
          const weightInput = getSetInputValue(set.id, 'weight');
          const repsInput = getSetInputValue(set.id, 'reps');
          const weight = parseFloat(weightInput) || set.weight;
          const reps = parseInt(repsInput) || set.reps;
          
          // If user has entered data for this set, update it
          if (weightInput || repsInput) {
            return {
              ...set,
              weight: weight || set.weight,
              reps: reps || set.reps,
            };
          }
          
          return set;
        }),
      })),
    };
  };

  // Initialize set inputs from workout data
  useEffect(() => {
    const inputs: { [key: string]: { weight: string; reps: string } } = {};
    workout.exercises.forEach(exercise => {
      exercise.sets.forEach(set => {
        // Only set input values if there's no existing input and the set has current session data
        if (!inputs[set.id]) {
          inputs[set.id] = {
            weight: set.weight && set.is_current_session ? set.weight.toString() : '',
            reps: set.reps && set.is_current_session ? set.reps.toString() : '',
          };
        }
      });
    });
    setSetInputs(prev => ({ ...prev, ...inputs }));
  }, [workout.exercises]);

  // Find next incomplete set for auto-advance
  const findNextIncompleteSet = () => {
    if (!activeSession) return null;

    for (let exerciseIndex = 0; exerciseIndex < activeSession.exercises.length; exerciseIndex++) {
      const exercise = activeSession.exercises[exerciseIndex];
      for (let setIndex = 0; setIndex < exercise.sets.length; setIndex++) {
        const set = exercise.sets[setIndex];
        if (!set.completed) {
          return { exerciseIndex, setIndex, exerciseId: exercise.id, setId: set.id };
        }
      }
    }
    return null; // No incomplete sets found
  };

  // Handle rest timer end with auto-advance
  const handleRestEnd = () => {
    endRestPeriod();
    
    // Auto-advance to next incomplete set
    const nextSet = findNextIncompleteSet();
    if (nextSet && activeSession) {
      updateSession({
        current_exercise_index: nextSet.exerciseIndex,
        current_set_index: nextSet.setIndex,
      });
      setActiveSetId(nextSet.setId);
    }
  };

  // Override the context's endRestPeriod to use our custom handler
  useEffect(() => {
    if (!activeSession?.is_rest_active && isWorkoutActive) {
      // Rest just ended, but we want to let our handleRestEnd manage the auto-advance
      // This effect runs when is_rest_active changes from true to false
    }
  }, [activeSession?.is_rest_active, isWorkoutActive]);

  // Set active set when clicking on a set input
  const handleSetInputFocus = (setId: string, exercise: Exercise) => {
    setActiveSetId(setId);
    
    // Update session context if workout is active
    if (isWorkoutActive && activeSession) {
      const exerciseIndex = activeSession.exercises.findIndex(ex => ex.id === exercise.id);
      const setIndex = exercise.sets.findIndex(set => set.id === setId);
      
      updateSession({
        current_exercise_index: exerciseIndex,
        current_set_index: setIndex,
      });
    }
  };

  // Handle set input changes - now includes unchecking completed sets when edited
  const handleSetInputChange = (setId: string, field: 'weight' | 'reps', value: string, set: ExerciseSet) => {
    // If this is a completed set being edited, uncheck it
    if (set.completed && set.is_current_session && value !== '') {
      setWorkout(prev => ({
        ...prev,
        exercises: prev.exercises.map(exercise => ({
          ...exercise,
          sets: exercise.sets.map(s => {
            if (s.id === setId) {
              return { 
                ...s, 
                completed: false, // Uncheck the set
                is_current_session: false // Remove current session flag
              };
            }
            return s;
          }),
        })),
      }));
    }
    
    // Update the input value
    updateSetInput(setId, field, value);
  };

  // Create workout session in database when workout starts
  const createWorkoutSessionInDB = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: sessionData, error } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: user.id,
          template_id: workout.id,
          workout_name: workout.name,
          duration_minutes: 0, // Will update when workout ends
          total_volume: 0, // Will calculate when workout ends
          date_performed: new Date().toISOString().split('T')[0],
          // completed_at will be null until workout is finished
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating workout session:', error);
        return null;
      }

      setSessionId(sessionData.id);
      console.log('Workout session created in database:', sessionData.id);
      return sessionData.id;
    } catch (error) {
      console.error('Error creating workout session:', error);
      return null;
    }
  };

  // Auto-start workout function
  const autoStartWorkout = async () => {
    console.log('Auto-starting workout...');
    
    // Save the workout template first
    const savedWorkout = await saveWorkout();
    if (savedWorkout) {
      // Create session in database
      const dbSessionId = await createWorkoutSessionInDB();
      if (dbSessionId) {
        setSessionId(dbSessionId);
      }
      
      // Start workout session in context
      startWorkoutSession(savedWorkout);

      setTimeout(async () => {
      console.log('Auto-ending workout after 12 hours');
      // Same process as manual end button
      await finishWorkoutSession();
      endWorkoutSession();
      setShowWorkoutComplete(true);
      }, 12 * 60 * 60 * 1000); // 12 hours in milliseconds
      
      console.log('Workout auto-started successfully');
      return true;
    }
    
    console.error('Failed to auto-start workout');
    return false;
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

      // Apply all current user inputs to the workout before saving
      const workoutWithInputs = applySetInputsToWorkout(workoutToSave || workout);
      
      // Prepare exercises data for database (store as JSONB)
      const exercisesForDB = workoutWithInputs.exercises.map(exercise => ({
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
        name: workoutWithInputs.name,
        description: `${workoutWithInputs.exercises.length} exercises`,
        exercises: exercisesForDB,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      let savedWorkout: any = null;

      if (workoutWithInputs.id) {
        // Update existing workout
        const { data, error } = await supabase
          .from('workout_templates')
          .update(workoutPayload)
          .eq('id', workoutWithInputs.id)
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

  // Handle set completion (when checkmark is clicked)
  const completeSet = async (exercise: Exercise, set: ExerciseSet) => {
    // Auto-start workout if not already active
    if (!isWorkoutActive) {
      console.log('Workout not active, auto-starting...');
      const startSuccess = await autoStartWorkout();
      if (!startSuccess) {
        Alert.alert('Error', 'Failed to start workout. Please try again.');
        return;
      }
      // Give a moment for the workout to start
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const weightInput = getSetInputValue(set.id, 'weight');
    const repsInput = getSetInputValue(set.id, 'reps');
    const weight = parseFloat(weightInput) || 0;
    const reps = parseInt(repsInput) || 0;

    if (weight === 0 && reps === 0) {
      Alert.alert('Input Required', 'Please enter weight and reps for this set');
      return;
    }

    try {
      // Save set to database
      if (sessionId) {
        const { error } = await supabase
          .from('workout_sets')
          .insert({
            session_id: sessionId,
            exercise_id: exercise.original_exercise_id || exercise.id,
            set_number: set.set_number,
            weight: weight,
            reps: reps,
            rest_seconds: exercise.duration_seconds || 60,
          });

        if (error) {
          console.error('Error saving set:', error);
        }
      }

      // Apply all current user inputs to preserve edits, then mark this specific set as completed
      const workoutWithAllInputs = applySetInputsToWorkout(workout);
      const updatedWorkout = {
        ...workoutWithAllInputs,
        exercises: workoutWithAllInputs.exercises.map(ex => {
          if (ex.id === exercise.id) {
            return {
              ...ex,
              sets: ex.sets.map(s => {
                if (s.id === set.id) {
                  return {
                    ...s,
                    weight: weight,
                    reps: reps,
                    completed: true,
                    is_current_session: true,
                    is_previous: false, // No longer previous data
                  };
                }
                return s; // Preserve all other sets as they are
              }),
            };
          }
          return ex;
        }),
      };

      setWorkout(updatedWorkout);

      // Update session context
      if (activeSession) {
        const exerciseIndex = activeSession.exercises.findIndex(ex => ex.id === exercise.id);
        const setIndex = exercise.sets.findIndex(s => s.id === set.id);
        
        const updatedExercises = [...activeSession.exercises];
        updatedExercises[exerciseIndex].sets[setIndex] = {
          ...updatedExercises[exerciseIndex].sets[setIndex],
          weight: weight,
          reps: reps,
          completed: true,
          is_current_session: true,
        };

        // Update session with completed set
        updateSession({
          exercises: updatedExercises,
        });

        startRestTimer(exercise.duration_seconds || 60);
      }

    } catch (error) {
      console.error('Error completing set:', error);
      Alert.alert('Error', 'Failed to save set. Please try again.');
    }
  };

  // Get current active set for highlighting
  const getActiveSetInfo = () => {
    if (!isWorkoutActive || !activeSession) {
      return { exerciseId: null, setIndex: -1 };
    }
    
    const currentExercise = activeSession.exercises[activeSession.current_exercise_index];
    return {
      exerciseId: currentExercise?.id || null,
      setIndex: activeSession.current_set_index,
    };
  };

  // Load workout data
  useEffect(() => {
    loadWorkoutData();
  }, [workoutData]);

  // Enhanced loadPreviousExerciseData function - Fixed to get most recent data per set number
  const loadPreviousExerciseData = async (originalExerciseId: string, setsCount: number) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
        console.log('No user found for previous data loading');
        return [];
        }

        console.log(`Looking for previous data for exercise: ${originalExerciseId}, expecting ${setsCount} sets`);

        // Get all completed workout sessions for this user
        const { data: completedSessions, error: sessionError } = await supabase
        .from('workout_sessions')
        .select('id, workout_name, completed_at, created_at')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null) // Only completed workouts
        .order('completed_at', { ascending: false });

        if (sessionError) {
        console.error('Error fetching sessions:', sessionError);
        return [];
        }

        if (!completedSessions || completedSessions.length === 0) {
        console.log('No completed sessions found');
        return [];
        }

        console.log(`Found ${completedSessions.length} completed sessions`);

        // Get all workout sets for this exercise across ALL completed sessions
        const { data: allSets, error: setsError } = await supabase
        .from('workout_sets')
        .select('session_id, set_number, weight, reps, created_at')
        .eq('exercise_id', originalExerciseId)
        .in('session_id', completedSessions.map(s => s.id))
        .order('created_at', { ascending: false }); // Most recent first

        if (setsError) {
        console.error('Error fetching workout sets:', setsError);
        return [];
        }

        if (!allSets || allSets.length === 0) {
        console.log(`No previous sets found for exercise ${originalExerciseId}`);
        return [];
        }

        console.log(`Found ${allSets.length} total sets across all sessions for this exercise`);

        // For each set number (1 to setsCount), find the most recent logged value
        const previousSets = [];
        for (let setNumber = 1; setNumber <= setsCount; setNumber++) {
        // Filter sets for this specific set number
        const setsForThisNumber = allSets.filter(set => set.set_number === setNumber);
        
        if (setsForThisNumber.length > 0) {
            // Take the most recent set for this set number (already ordered by created_at desc)
            const mostRecentSet = setsForThisNumber[0];
            previousSets.push({
            set_number: setNumber,
            weight: mostRecentSet.weight,
            reps: mostRecentSet.reps,
            session_date: mostRecentSet.created_at, // For debugging
            });
            
            console.log(`Set ${setNumber}: Found previous data - ${mostRecentSet.weight}kg x ${mostRecentSet.reps} reps`);
        } else {
            console.log(`Set ${setNumber}: No previous data found`);
        }
        }

        console.log(`Returning ${previousSets.length} sets with previous data`);
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
                const previousSet = previousSets.find((set: { set_number: number; weight: number; reps: number }) => set.set_number === i);

                sets.push({
                  id: `${exercise.id}-${i}`,
                  set_number: i,
                  weight: previousSet?.weight || undefined,
                  reps: previousSet?.reps || undefined,
                  completed: false, // Not completed in current session
                  is_previous: !!previousSet, // Mark as previous data if we found historical data
                  is_current_session: false,
                  // Lock the original previous data at workout load
                  original_previous_weight: previousSet?.weight || undefined,
                  original_previous_reps: previousSet?.reps || undefined,
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

          // Enhanced debug log to show what data was loaded
          console.log('Loaded workout with exercise details:');
          transformedExercises.forEach(ex => {
            console.log(`Exercise: ${ex.name} (original_id: ${ex.original_exercise_id})`);
            ex.sets.forEach(set => {
              console.log(`  Set ${set.set_number}: weight=${set.weight}, reps=${set.reps}, is_previous=${set.is_previous}, original_weight=${set.original_previous_weight}, original_reps=${set.original_previous_reps}`);
            });
          });
        }
      } catch (error) {
        console.error('Error loading workout data:', error);
      }
    }
  };

  // Calculate exercise count and duration
  const exerciseCount = workout.exercises.length;
  const totalDuration = workout.estimated_duration || 0; // Keep static, don't update in real-time

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
    if (isWorkoutActive) {
      Alert.alert(
        'Workout in Progress',
        'Your workout is still active. What would you like to do?',
        [
          { text: 'Continue Workout', style: 'cancel' },
          { 
            text: 'End Workout',
            style: 'destructive',
            onPress: handleEndWorkout
          },
        ]
      );
      return;
    }

    // Only save workout if it has content and a meaningful name
    if (workout.exercises.length > 0 && workout.name.trim() !== 'New Workout') {
      await saveWorkout();
    }
    navigation.goBack();
  };

  // Updated settings handler with reorder option
  const handleSettings = () => {
    if (workout.exercises.length === 0) {
      Alert.alert('No Exercises', 'Add some exercises first to access workout settings.');
      return;
    }

    Alert.alert(
      'Workout Settings',
      'Choose an option:',
      [
        { 
          text: 'Reorder Exercises', 
          onPress: handleReorderExercises
        },
        { 
          text: 'Workout Notes', 
          onPress: () => Alert.alert('Workout Notes', 'Coming soon!') 
        },
        { 
          text: 'Schedule Workout', 
          onPress: () => Alert.alert('Schedule', 'Coming soon!') 
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Handle navigation to ReorderExercisesScreen
  const handleReorderExercises = () => {
    navigation.navigate('ReorderExercises', {
      workout: workout,
      onReorder: (reorderedExercises: Exercise[]) => {
        // Update the workout with reordered exercises
        const updatedWorkout = {
          ...workout,
          exercises: reorderedExercises,
        };
        setWorkout(updatedWorkout);
        
        // Save to database
        saveWorkout(updatedWorkout);
        
        console.log('Exercises reordered successfully');
      }
    });
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
              const previousSet = previousSets.find((set: { set_number: number; weight: number; reps: number }) => set.set_number === i);
              sets.push({
                id: `${uniqueInstanceId}-${i}`,
                set_number: i,
                weight: previousSet?.weight || undefined,
                reps: previousSet?.reps || undefined,
                completed: false,
                is_previous: !!previousSet, // Mark as previous data if found
                is_current_session: false,
                // Lock the original previous data at workout load
                original_previous_weight: previousSet?.weight || undefined,
                original_previous_reps: previousSet?.reps || undefined,
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
    
    const startSuccess = await autoStartWorkout();
    if (startSuccess) {
      // Set first exercise/set as active
      if (workout.exercises.length > 0) {
        setActiveSetId(workout.exercises[0].sets[0]?.id || null);
      }
      
      Alert.alert('Workout Started!', 'Your workout is now active. Complete sets by filling in weight/reps and tapping the checkmark.');
    }
  };

  // Handle ending workout
  const handleEndWorkout = async () => {
    Alert.alert(
      'End Workout',
      'Are you sure you want to end the active workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'End Workout',
          style: 'destructive',
          onPress: async () => {
            await finishWorkoutSession();
            endWorkoutSession();
            setShowWorkoutComplete(true);
          }
        },
      ]
    );
  };

  // Handle workout completion save
  const handleWorkoutCompleteSave = async () => {
    setShowWorkoutComplete(false);
    navigation.navigate('MainTabs', { screen: 'Workouts' });
  };

  // Finish workout session in database
  const finishWorkoutSession = async () => {
    try {
      if (!sessionId) return;

      // Calculate total volume from current workout state (with all user inputs applied)
      const workoutWithInputs = applySetInputsToWorkout(workout);
      const totalVolume = workoutWithInputs.exercises.reduce((total: number, exercise: Exercise) => {
        return total + exercise.sets.reduce((exerciseTotal: number, set: ExerciseSet) => {
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
        .eq('id', sessionId);

      if (error) {
        console.error('Error finishing workout session:', error);
      }

      console.log('Workout session completed successfully');
    } catch (error) {
      console.error('Error finishing workout session:', error);
    }
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
          
          const newSet: ExerciseSet = {
            id: `${exerciseId}-${newSetNumber}`,
            set_number: newSetNumber,
            weight: undefined,
            reps: undefined,
            completed: false,
            is_previous: false,
            is_current_session: false,
            original_previous_weight: undefined,
            original_previous_reps: undefined,
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

  // Skip rest period with auto-advance
  const skipRest = () => {
    handleRestEnd();
  };

  // Render exercise block (original version, no drag and drop)
  const renderExercise = (exercise: Exercise, exerciseIndex: number) => {
    const activeSetInfo = getActiveSetInfo();
    const isCurrentExercise = exercise.id === activeSetInfo.exerciseId;

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

          {/* Set Rows - Directly Editable */}
          {exercise.sets.map((set, setIndex) => {
            const isCurrentSet = isCurrentExercise && setIndex === activeSetInfo.setIndex && isWorkoutActive;
            const isCompletedInSession = set.completed && set.is_current_session;
            
            // Get input values for each field
            const weightInput = getSetInputValue(set.id, 'weight');
            const repsInput = getSetInputValue(set.id, 'reps');
            
            // Use original locked previous data for placeholders (not current session data)
            const showPreviousWeight = set.is_previous && !set.is_current_session && !weightInput;
            const showPreviousReps = set.is_previous && !set.is_current_session && !repsInput;
            
            // Determine display values
            const displayWeight = weightInput || (isCompletedInSession ? set.weight?.toString() || '' : '');
            const displayReps = repsInput || (isCompletedInSession ? set.reps?.toString() || '' : '');
            
            // Use original previous data for placeholders - locked at workout start
            const placeholderWeight = showPreviousWeight && set.original_previous_weight ? 
              set.original_previous_weight.toString() : '-';
            const placeholderReps = showPreviousReps && set.original_previous_reps ? 
              set.original_previous_reps.toString() : '-';
            
            return (
              <View 
                key={set.id} 
                style={[
                  styles.setRow,
                  isCurrentSet && styles.currentSetRow // Light blue highlight for current set
                ]}
              >
                <Text style={styles.setNumber}>{set.set_number}</Text>
                
                {/* Weight Input */}
                <TextInput
                  style={[
                    styles.setInput,
                    isCompletedInSession && styles.currentSessionValueInput
                  ]}
                  value={displayWeight}
                  onChangeText={(value) => handleSetInputChange(set.id, 'weight', value, set)}
                  onFocus={() => handleSetInputFocus(set.id, exercise)}
                  placeholder={placeholderWeight}
                  placeholderTextColor={showPreviousWeight ? '#AFAFAF' : '#CCCCCC'}
                  keyboardType="numeric"
                  editable={true}
                />
                
                {/* Reps Input */}
                <TextInput
                  style={[
                    styles.setInput,
                    isCompletedInSession && styles.currentSessionValueInput
                  ]}
                  value={displayReps}
                  onChangeText={(value) => handleSetInputChange(set.id, 'reps', value, set)}
                  onFocus={() => handleSetInputFocus(set.id, exercise)}
                  placeholder={placeholderReps}
                  placeholderTextColor={showPreviousReps ? '#AFAFAF' : '#CCCCCC'}
                  keyboardType="numeric"
                  editable={true}
                />
                
                {/* Checkmark */}
                <TouchableOpacity 
                  style={styles.checkColumn}
                  onPress={() => completeSet(exercise, set)}
                >
                  <Ionicons
                    name={set.completed ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={isCompletedInSession ? "#17D4D4" : "#CCCCCC"}
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
        {/* Header - Now scrolls with content */}
        <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={24} color="#000000" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleSettings}>
            <Ionicons name="settings-outline" size={24} color="#000000" />
            </TouchableOpacity>
        </View>

      {/* <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}> */}
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
        {workout.exercises.map((exercise, index) => renderExercise(exercise, index))}

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

      {/* Rest Timer (Original Design) */}
      {isWorkoutActive && activeSession?.is_rest_active && (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
        >
        <View style={styles.restTimerOverlay}>
          <View style={styles.restTimerContainer}>
            {/* Skip Button (Floating Above) */}
            <TouchableOpacity style={styles.skipButtonTop} onPress={skipRest}>
              <Text style={styles.skipButtonTopText}>Skip</Text>
            </TouchableOpacity>
            
            {/* Control Bar */}
            <View style={styles.restControlBar}>
              {/* -15secs Button */}
              <TouchableOpacity 
                style={styles.restControlButton}
                onPress={() => adjustRestTime(-15)}
              >
                <Text style={styles.restControlButtonText}>-15secs</Text>
              </TouchableOpacity>
              
              {/* Timer Display (Overlaid) */}
              <View style={styles.restTimerDisplay}>
                <Text style={styles.restTimerText}>{formatTime(restTime)}</Text>
              </View>
              
              {/* +15secs Button */}
              <TouchableOpacity 
                style={styles.restControlButton}
                onPress={() => adjustRestTime(15)}
              >
                <Text style={styles.restControlButtonText}>+15secs</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      )}

      {/* Floating Start/End Button - Original Design */}
      {isWorkoutActive ? (
        // Show End button with timer when workout is active (but not during rest)
        !activeSession?.is_rest_active && (
          <View style={styles.floatingWorkoutControls}>
            <View style={styles.workoutTimerSection}>
              <Text style={styles.timerText}>{formatTime(workoutTime)}</Text>
            </View>
            <TouchableOpacity style={styles.endButton} onPress={handleEndWorkout}>
              <Text style={styles.endButtonText}>End</Text>
            </TouchableOpacity>
          </View>
        )
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

      {/* Workout Complete Modal */}
      <Modal
        visible={showWorkoutComplete}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWorkoutComplete(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.workoutCompleteModal}>
            <Text style={styles.workoutCompleteTitle}>🎉 Workout Complete!</Text>
            <Text style={styles.workoutCompleteSubtitle}>
              Great job! You've finished your workout.
            </Text>
            <Text style={styles.workoutCompleteStats}>
              Duration: {formatTime(workoutTime)}
            </Text>
            <TouchableOpacity 
              style={styles.saveWorkoutButton} 
              onPress={handleWorkoutCompleteSave}
            >
              <Text style={styles.saveWorkoutButtonText}>Save</Text>
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
    justifyContent: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
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
  
  // Directly Editable Set Inputs
  setInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  currentSessionValueInput: {
    color: '#000000', // Black for current session data
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
  
  // Rest Timer (Original Design)
  restTimerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 100, // Above tab bar
  },
  restTimerContainer: {
    marginBottom: -70,
    alignItems: 'center',
  },
  skipButtonTop: {
    backgroundColor: '#8C8C8C',
    borderRadius: 32,
    paddingHorizontal: 40,
    paddingVertical: 8,
    marginBottom: -18, // Overlap with control bar
    zIndex: 1,
    height: 48,
  },
  skipButtonTopText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  restControlBar: {
    backgroundColor: '#0F1113',
    borderRadius: 32,
    height: 48,
    width: '90%',
    maxWidth: 320,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: -15,
    position: 'relative',
    zIndex: 1,
  },
  restControlButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  restControlButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  restTimerDisplay: {
    position: 'absolute',
    left: '50%',
    marginLeft: -48, // Half of width to center
    backgroundColor: '#17D4D4',
    borderRadius: 22,
    height: 48,
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  restTimerText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
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
  
  // Floating Workout Controls (Original Design)
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
  
  // Workout Complete Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  workoutCompleteModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  workoutCompleteTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  workoutCompleteSubtitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#6C6C6C',
    textAlign: 'center',
    marginBottom: 16,
  },
  workoutCompleteStats: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#17D4D4',
    textAlign: 'center',
    marginBottom: 24,
  },
  saveWorkoutButton: {
    backgroundColor: '#17D4D4',
    borderRadius: 28,
    paddingHorizontal: 48,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  saveWorkoutButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  
  bottomSpacing: {
    height: 120, // Extra space so content doesn't hide behind floating button + tab bar
  },
  keyboardAvoidingView: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 1000,
  },
});

export default EditWorkoutScreen;