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
  id: string;
  name: string;
  duration_seconds?: number;
  sets_count: number;
  reps_count: number;
  sets: ExerciseSet[];
  has_unread_comments?: boolean;
  thumbnail_url?: string;
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

  const [workout, setWorkout] = useState<WorkoutTemplate>({
    id: workoutData?.id,
    name: workoutData?.name || 'New Workout',
    exercises: workoutData?.exercises || [],
    estimated_duration: workoutData?.estimated_duration || 0,
  });

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(workout.name);

  // Sample data for testing filled state
  useEffect(() => {
    // If it's not a new workout and we don't have exercises, load sample data
    if (!isNewWorkout && workout.exercises.length === 0) {
      // Sample data to match the design
      const sampleExercises: Exercise[] = [
        {
          id: '1',
          name: 'Leg Press',
          duration_seconds: 60,
          sets_count: 3,
          reps_count: 8,
          has_unread_comments: false,
          sets: [
            { id: '1-1', set_number: 1, weight: 32, reps: 8, completed: true, is_previous: true },
            { id: '1-2', set_number: 2, weight: 32, reps: 8, completed: true, is_previous: true },
            { id: '1-3', set_number: 3, weight: 30, reps: 7, completed: true, is_previous: true },
          ],
        },
        {
          id: '2',
          name: 'Incline Dumbell Curl',
          duration_seconds: 120,
          sets_count: 2,
          reps_count: 15,
          has_unread_comments: true, // Show red dot
          sets: [
            { id: '2-1', set_number: 1, weight: 12, reps: 15, completed: true, is_previous: true },
            { id: '2-2', set_number: 2, weight: undefined, reps: undefined, completed: false, is_previous: false },
          ],
        },
      ];
      setWorkout(prev => ({ ...prev, exercises: sampleExercises, estimated_duration: 15 }));
    }
  }, [isNewWorkout]);

  // Calculate exercise count and duration
  const exerciseCount = workout.exercises.length;
  const totalDuration = workout.estimated_duration || 0;

  // Handle title editing
  const handleTitlePress = () => {
    setIsEditingTitle(true);
    setTempTitle(workout.name);
  };

  const handleTitleSave = () => {
    setWorkout(prev => ({ ...prev, name: tempTitle.trim() || 'New Workout' }));
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setTempTitle(workout.name);
    setIsEditingTitle(false);
  };

  // Navigation handlers
  const handleBack = () => {
    navigation.goBack();
  };

  const handleSettings = () => {
    Alert.alert('Settings', 'Workout settings coming soon!');
  };

  const handleAddExercise = () => {
    navigation.navigate('ExerciseLibrary', {
      onExercisesSelected: (selectedExercises: any[]) => {
        // Handle selected exercises and add them to workout
        console.log('Selected exercises:', selectedExercises);
        Alert.alert('Success', `Added ${selectedExercises.length} exercises to workout!`);
        // TODO: Actually add exercises to workout state
      }
    });
  };

  const handleStart = () => {
    if (workout.exercises.length === 0) {
      Alert.alert('No Exercises', 'Please add some exercises before starting the workout.');
      return;
    }
    Alert.alert('Start Workout', 'Starting workout session coming soon!');
  };

  // Exercise handlers
  const handleExerciseComments = (exercise: Exercise) => {
    Alert.alert('Comments', `Comments for ${exercise.name} coming soon!`);
  };

  const handleExerciseMenu = (exercise: Exercise) => {
    Alert.alert(
      'Exercise Options',
      'Choose an option:',
      [
        { text: 'Edit Rest Time', onPress: () => Alert.alert('Edit Rest Time', 'Coming soon!') },
        { text: 'Edit Sets', onPress: () => Alert.alert('Edit Sets', 'Coming soon!') },
        { text: 'Edit Reps', onPress: () => Alert.alert('Edit Reps', 'Coming soon!') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleAddSet = (exerciseId: string) => {
    Alert.alert('Add Set', `Adding set to exercise ${exerciseId} coming soon!`);
  };

  // Render exercise block
  const renderExercise = (exercise: Exercise) => (
    <View key={exercise.id} style={styles.exerciseBlock}>
      {/* Exercise Header */}
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseInfo}>
          <View style={[styles.exerciseThumbnail, styles.thumbnailPlaceholder]}>
            <Ionicons name="fitness" size={20} color="#17D4D4" />
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
                <Ionicons name="time-outline" size={16} color="#5A5A5A" />
                <Text style={styles.metaText}>{exercise.duration_seconds || 0} secs</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaText}>
                  {exercise.sets_count} sets × {exercise.reps_count} reps
                </Text>
              </View>
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
                color={set.completed ? "#17D4D4" : "#CCCCCC"}
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
            <Ionicons name="link-outline" size={16} color="#5A5A5A" />
            <Text style={styles.metadataText}>{exerciseCount} exercises</Text>
          </View>
          <View style={styles.metadataItem}>
            <Ionicons name="time-outline" size={16} color="#5A5A5A" />
            <Text style={styles.metadataText}>{totalDuration} mins</Text>
          </View>
        </View>

        {/* Exercises List */}
        {workout.exercises.map(renderExercise)}

        {/* Add Exercise Button */}
        <TouchableOpacity style={styles.addExerciseButton} onPress={handleAddExercise}>
          <View style={styles.addExerciseIcon}>
            <Ionicons name="add" size={24} color="#17D4D4" />
          </View>
          <Text style={styles.addExerciseText}>Add Exercise</Text>
        </TouchableOpacity>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Start Button */}
      <TouchableOpacity style={styles.floatingStartButton} onPress={handleStart}>
        <Text style={styles.startButtonText}>Start</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9FC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#F9F9FC',
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
    color: '#5A5A5A',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DFFCFD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  addExerciseText: {
    fontSize: 18,
    fontFamily: 'Poppins-Medium',
    color: '#000000',
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
    width: 32,
    height: 32,
    borderRadius: 16,
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
    fontSize: 18,
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
    color: '#5A5A5A',
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
    color: '#5A5A5A',
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
  
  // Floating Start Button
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
    elevation: 8, // For Android shadow
    zIndex: 1000, // Ensure it floats above everything
  },
  startButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  bottomSpacing: {
    height: 80, // Extra space so content doesn't hide behind floating button
  },
});

export default EditWorkoutScreen;