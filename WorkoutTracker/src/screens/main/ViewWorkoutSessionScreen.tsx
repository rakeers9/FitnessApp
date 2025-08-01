// src/screens/main/ViewWorkoutSessionScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { supabase } from '../../services/supabase';

// Types
type ViewWorkoutSessionScreenProps = {
  navigation: StackNavigationProp<any>;
  route: RouteProp<any>;
};

interface WorkoutSet {
  id: string;
  set_number: number;
  weight: number;
  reps: number;
  rest_seconds?: number;
  exercise_id: string;
}

interface Exercise {
  id: string;
  name: string;
  muscle_groups: string[];
  sets: WorkoutSet[];
}

interface WorkoutSession {
  id: string;
  workout_name: string;
  duration_minutes: number;
  total_volume: number;
  completed_at: string;
  notes?: string;
  date_performed: string;
}

const ViewWorkoutSessionScreen: React.FC<ViewWorkoutSessionScreenProps> = ({ navigation, route }) => {
  // Get data from route params (with safe defaults)
  const { sessionId, sessionName, date, dateDisplay } = route.params || {};

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      Alert.alert('Error', 'Session ID is required', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
      return;
    }
    loadSessionData();
  }, [sessionId, navigation]);

  const loadSessionData = async () => {
    try {
      setLoading(true);

      // Load session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        console.error('Error loading session:', sessionError);
        return;
      }

      setSession(sessionData);

      // Load workout sets separately
      const { data: setsData, error: setsError } = await supabase
        .from('workout_sets')
        .select('*')
        .eq('session_id', sessionId)
        .order('exercise_id')
        .order('set_number');

      if (setsError) {
        console.error('Error loading sets:', setsError);
        return;
      }

      if (!setsData || setsData.length === 0) {
        console.log('No sets found for this session');
        setExercises([]);
        return;
      }

      // Get unique exercise IDs
      const exerciseIds = [...new Set(setsData.map(set => set.exercise_id))];

      // Load exercise details separately
      const { data: exerciseData, error: exerciseError } = await supabase
        .from('exercises')
        .select('id, name, muscle_groups')
        .in('id', exerciseIds);

      if (exerciseError) {
        console.error('Error loading exercises:', exerciseError);
        return;
      }

      // Create exercise map for easy lookup
      const exerciseMap = new Map();
      exerciseData?.forEach(exercise => {
        exerciseMap.set(exercise.id, exercise);
      });

      // Group sets by exercise
      const exerciseGroupMap = new Map<string, Exercise>();
      
      setsData.forEach((set: any) => {
        const exerciseId = set.exercise_id;
        const exercise = exerciseMap.get(exerciseId);
        
        if (!exerciseGroupMap.has(exerciseId)) {
          exerciseGroupMap.set(exerciseId, {
            id: exerciseId,
            name: exercise?.name || 'Unknown Exercise',
            muscle_groups: exercise?.muscle_groups || [],
            sets: [],
          });
        }
        
        exerciseGroupMap.get(exerciseId)!.sets.push({
          id: set.id,
          set_number: set.set_number,
          weight: set.weight,
          reps: set.reps,
          rest_seconds: set.rest_seconds,
          exercise_id: set.exercise_id,
        });
      });

      setExercises(Array.from(exerciseGroupMap.values()));

    } catch (error) {
      console.error('Error in loadSessionData:', error);
    } finally {
      setLoading(false);
    }
  };

  // Navigation handlers
  const handleBack = () => {
    navigation.goBack();
  };

  // Format time
  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format time of day
  const formatTimeOfDay = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Render exercise block
  const renderExercise = (exercise: Exercise, exerciseIndex: number) => {
    const totalVolume = exercise.sets.reduce((total, set) => total + (set.weight * set.reps), 0);
    const avgWeight = exercise.sets.length > 0 
      ? Math.round(exercise.sets.reduce((sum, set) => sum + set.weight, 0) / exercise.sets.length)
      : 0;

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
                {exercise.sets.length} sets • {Math.round(totalVolume)}kg total • {avgWeight}kg avg
              </Text>
              {exercise.muscle_groups.length > 0 && (
                <Text style={styles.muscleGroups}>
                  {exercise.muscle_groups.join(', ')}
                </Text>
              )}
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
            <Text style={styles.columnHeader}>Volume</Text>
          </View>

          {/* Set Rows */}
          {exercise.sets.map((set, setIndex) => {
            const volume = set.weight * set.reps;
            
            return (
              <View key={set.id} style={styles.setRow}>
                <Text style={styles.setNumber}>{set.set_number}</Text>
                <Text style={styles.setValue}>{set.weight}</Text>
                <Text style={styles.setValue}>{set.reps}</Text>
                <Text style={styles.setVolume}>{Math.round(volume)}kg</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading workout session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Workout session not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Workout Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Session Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.workoutTitle}>{session.workout_name}</Text>
          <Text style={styles.dateText}>{formatDate(session.date_performed)}</Text>
          <Text style={styles.timeText}>Completed at {formatTimeOfDay(session.completed_at)}</Text>
          
          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={20} color="#17D4D4" />
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue}>{formatTime(session.duration_minutes)}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="barbell-outline" size={20} color="#17D4D4" />
              <Text style={styles.statLabel}>Total Volume</Text>
              <Text style={styles.statValue}>{Math.round(session.total_volume)}kg</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="fitness-outline" size={20} color="#17D4D4" />
              <Text style={styles.statLabel}>Exercises</Text>
              <Text style={styles.statValue}>{exercises.length}</Text>
            </View>
          </View>

          {/* Notes */}
          {session.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesText}>{session.notes}</Text>
            </View>
          )}
        </View>

        {/* Exercises */}
        <View style={styles.exercisesSection}>
          <Text style={styles.sectionTitle}>Exercises Performed</Text>
          {exercises.map((exercise, index) => renderExercise(exercise, index))}
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
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
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // Loading/Error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#6E6E6E',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#FF3B3B',
  },
  
  // Summary Section
  summarySection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  workoutTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-ExtraBold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#17D4D4',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#6E6E6E',
    marginBottom: 24,
  },
  
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    paddingVertical: 20,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#6E6E6E',
    marginTop: 4,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
  },
  
  // Notes Section
  notesSection: {
    width: '100%',
    backgroundColor: '#DFFCFD',
    borderRadius: 12,
    padding: 16,
  },
  notesLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333333',
    lineHeight: 20,
  },
  
  // Exercises Section
  exercisesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    marginBottom: 16,
  },
  
  // Exercise Blocks
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
    marginBottom: 2,
  },
  muscleGroups: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#17D4D4',
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
  setValue: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  setVolume: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#17D4D4',
    flex: 1,
    textAlign: 'center',
  },
  
  bottomSpacing: {
    height: 40,
  },
});

export default ViewWorkoutSessionScreen;