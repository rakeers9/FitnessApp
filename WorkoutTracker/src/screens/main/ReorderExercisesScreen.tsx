// src/screens/main/ReorderExercisesScreen.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  PanResponder,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

// Types for navigation  
type ReorderExercisesScreenProps = {
  navigation: StackNavigationProp<any>;
  route: RouteProp<any, any>;
};

// Types for exercise data (simplified for reordering)
interface Exercise {
  id: string;
  name: string;
  duration_seconds?: number;
  sets_count: number;
  reps_count: number;
  muscle_groups?: string[];
}

const ReorderExercisesScreen: React.FC<ReorderExercisesScreenProps> = ({ navigation, route }) => {
  // Get workout data and callback from route params
  const { workout, onReorder } = route.params;
  
  // State for drag and drop
  const [exercises, setExercises] = useState<Exercise[]>(workout.exercises);
  const [draggedIndex, setDraggedIndex] = useState<number>(-1);
  const dragY = useState(new Animated.Value(0))[0];

  // Simple drag handlers
  const startDrag = (index: number) => {
    console.log('Starting drag for index:', index);
    setDraggedIndex(index);
    dragY.setValue(0);
  };

  const moveDrag = (gestureY: number) => {
    if (draggedIndex === -1) return;
    
    dragY.setValue(gestureY);
    
    // Calculate new position
    const itemHeight = 80; // Approximate item height
    const newIndex = Math.max(0, Math.min(exercises.length - 1, 
      draggedIndex + Math.round(gestureY / itemHeight)
    ));
    
    if (newIndex !== draggedIndex) {
      // Reorder the array
      const newExercises = [...exercises];
      const [movedItem] = newExercises.splice(draggedIndex, 1);
      newExercises.splice(newIndex, 0, movedItem);
      
      setExercises(newExercises);
      setDraggedIndex(newIndex);
      dragY.setValue(0); // Reset position after reorder
    }
  };

  const endDrag = () => {
    console.log('Ending drag');
    setDraggedIndex(-1);
    dragY.setValue(0);
  };

  // Create PanResponder
  const createPanResponder = (index: number) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      onPanResponderGrant: () => {
        startDrag(index);
      },
      
      onPanResponderMove: (evt, gestureState) => {
        moveDrag(gestureState.dy);
      },
      
      onPanResponderRelease: () => {
        endDrag();
      },
      
      onPanResponderTerminate: () => {
        endDrag();
      },
    });
  };

  // Handle save and return to EditWorkout
  const handleSave = () => {
    console.log('Saving reordered exercises');
    onReorder(exercises);
    navigation.goBack();
  };

  // Handle cancel - go back without saving
  const handleCancel = () => {
    navigation.goBack();
  };

  // Render exercise card (simplified version for reordering)
  const renderExerciseCard = (exercise: Exercise, index: number) => {
    const isDragged = draggedIndex === index;
    const panResponder = createPanResponder(index);
    
    return (
      <Animated.View
        key={exercise.id}
        style={[
          styles.exerciseCard,
          isDragged && styles.exerciseCardDragged,
          isDragged && {
            transform: [{ translateY: dragY }],
            zIndex: 1000,
          }
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.exerciseCardContent}>
          <View style={styles.exerciseInfo}>
            <View style={[styles.exerciseThumbnail, styles.thumbnailPlaceholder]}>
              <Ionicons name="fitness" size={24} color="#17D4D4" />
            </View>
            <View style={styles.exerciseDetails}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
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
            
            {/* Drag Handle */}
            <View style={styles.dragHandle}>
              <Ionicons 
                name="reorder-three-outline" 
                size={24} 
                color={isDragged ? "#17D4D4" : "#CCCCCC"} 
              />
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleCancel}>
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reorder Exercises</Text>
        <View style={styles.headerButton} />
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          Press and hold any exercise to reorder
        </Text>
      </View>

      {/* Exercise Cards - Remove ScrollView to avoid conflicts */}
      <View style={styles.exerciseContainer}>
        {exercises.map((exercise, index) => renderExerciseCard(exercise, index))}
      </View>

      {/* Full-width Save Button */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
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
    width: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
  },
  instructionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  instructionsText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#6C6C6C',
    textAlign: 'center',
  },
  exerciseContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // Exercise Cards
  exerciseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    height: 80,
  },
  exerciseCardContent: {
    flex: 1,
  },
  exerciseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
    marginBottom: 4,
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
  
  // Drag Handle
  dragHandle: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Drag States
  exerciseCardDragged: {
    backgroundColor: '#F8FFFE',
    borderColor: '#17D4D4',
    borderWidth: 2,
    elevation: 8,
    shadowColor: '#17D4D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  
  // Save button
  saveButtonContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  saveButton: {
    backgroundColor: '#17D4D4',
    borderRadius: 24,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
});

export default ReorderExercisesScreen;