// src/screens/main/ExerciseLibraryScreen.tsx

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
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { supabase } from '../../services/supabase';

// Types
type ExerciseLibraryScreenProps = {
  navigation: StackNavigationProp<any>;
  route: RouteProp<any>;
};

interface Exercise {
  id: string;
  name: string;
  muscle_groups: string[];
  equipment?: string;
  is_custom: boolean;
  created_by?: string;
}

interface MuscleGroup {
  id: string;
  name: string;
  selected: boolean;
}

const ExerciseLibraryScreen: React.FC<ExerciseLibraryScreenProps> = ({ navigation, route }) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Filter and create states
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set());
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [selectedMusclesForCustom, setSelectedMusclesForCustom] = useState<Set<string>>(new Set());

  // Available muscle groups
  const availableMuscles = [
    'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms',
    'Abs', 'Quads', 'Hamstrings', 'Calves', 'Glutes', 'CUSTOM'
  ];

  // Check mode
  const mode = route.params?.mode;
  const isCreateLogMode = mode === 'create_log';
  const isAddToLogMode = mode === 'add_to_log';

  useEffect(() => {
    loadExercises();
    initializeMuscleGroups();
  }, []);

  useEffect(() => {
    filterExercises();
  }, [exercises, searchQuery, selectedFilters]);

  const initializeMuscleGroups = () => {
    const muscles = availableMuscles.map(muscle => ({
      id: muscle.toLowerCase(),
      name: muscle,
      selected: false,
    }));
    setMuscleGroups(muscles);
  };

  const loadExercises = async () => {
    try {
      setLoading(true);
      
      // Get current user for custom exercises
      const { data: { user } } = await supabase.auth.getUser();
      
      // Load all exercises (both default and user's custom)
      let query = supabase
        .from('exercises')
        .select('*')
        .order('name');

      if (user) {
        // Include default exercises and user's custom exercises
        query = query.or(`is_custom.eq.false,and(is_custom.eq.true,created_by.eq.${user.id})`);
      } else {
        // Only default exercises if no user
        query = query.eq('is_custom', false);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading exercises:', error);
        Alert.alert('Error', 'Failed to load exercises');
        return;
      }

      setExercises(data || []);
    } catch (error) {
      console.error('Error in loadExercises:', error);
      Alert.alert('Error', 'Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

  const filterExercises = () => {
    let filtered = [...exercises];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(exercise =>
        exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Muscle group filter
    if (selectedFilters.size > 0) {
      filtered = filtered.filter(exercise => {
        // Handle CUSTOM filter
        if (selectedFilters.has('custom') && exercise.is_custom) {
          return true;
        }
        
        // Handle muscle group filters
        const hasMatchingMuscle = exercise.muscle_groups?.some(muscle =>
          selectedFilters.has(muscle.toLowerCase())
        );
        
        return hasMatchingMuscle;
      });
    }

    setFilteredExercises(filtered);
  };

  // Exercise selection handlers
  const toggleExerciseSelection = (exerciseId: string) => {
    const newSelected = new Set(selectedExercises);
    if (newSelected.has(exerciseId)) {
      newSelected.delete(exerciseId);
    } else {
      newSelected.add(exerciseId);
    }
    setSelectedExercises(newSelected);
  };

  // Filter modal handlers
  const toggleMuscleFilter = (muscleId: string) => {
    const newFilters = new Set(selectedFilters);
    if (newFilters.has(muscleId)) {
      newFilters.delete(muscleId);
    } else {
      newFilters.add(muscleId);
    }
    setSelectedFilters(newFilters);
  };

  const clearFilters = () => {
    setSelectedFilters(new Set());
    setShowFilterModal(false);
  };

  // Custom exercise creation
  const toggleMuscleForCustom = (muscleId: string) => {
    const newMuscles = new Set(selectedMusclesForCustom);
    if (newMuscles.has(muscleId)) {
      newMuscles.delete(muscleId);
    } else {
      newMuscles.add(muscleId);
    }
    setSelectedMusclesForCustom(newMuscles);
  };

  const createCustomExercise = async () => {
    if (!customExerciseName.trim()) {
      Alert.alert('Error', 'Please enter an exercise name');
      return;
    }

    if (selectedMusclesForCustom.size === 0) {
      Alert.alert('Error', 'Please select at least one muscle group');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to create custom exercises');
        return;
      }

      const muscleArray = Array.from(selectedMusclesForCustom).map(m => 
        m === 'custom' ? 'Custom' : availableMuscles.find(muscle => muscle.toLowerCase() === m) || m
      );

      const { data, error } = await supabase
        .from('exercises')
        .insert({
          name: customExerciseName.trim(),
          muscle_groups: muscleArray,
          is_custom: true,
          created_by: user.id,
          equipment: 'Custom',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating exercise:', error);
        Alert.alert('Error', 'Failed to create exercise');
        return;
      }

      // Add to exercises list
      setExercises(prev => [...prev, data]);
      
      // Reset form
      setCustomExerciseName('');
      setSelectedMusclesForCustom(new Set());
      setShowCreateModal(false);
      
      Alert.alert('Success', 'Custom exercise created!');
    } catch (error) {
      console.error('Error in createCustomExercise:', error);
      Alert.alert('Error', 'Failed to create exercise');
    }
  };

  // Navigation handlers
  const handleBack = () => {
    navigation.goBack();
  };

  // UPDATED: Main function to handle adding exercises
  const handleAddToWorkout = () => {
    if (selectedExercises.size === 0) {
      Alert.alert('No Selection', 'Please select at least one exercise to add');
      return;
    }

    const selectedExerciseData = exercises.filter(ex => selectedExercises.has(ex.id));
    
    // Check if this is add_to_log mode (adding to existing workout log)
    if (isAddToLogMode) {
      // Call the callback function to add exercises to the existing workout
      if (route.params?.onExercisesSelected) {
        route.params.onExercisesSelected(selectedExerciseData);
      }
      navigation.goBack();
      return;
    }
    
    // Check if this is create_log mode (coming from WorkoutLogsScreen)
    if (isCreateLogMode) {
      // Handle create_log mode - navigate directly to LogWorkout
      const { date, dateDisplay } = route.params;
      
      // Create custom workout with selected exercises
      const customWorkout = {
        id: 'custom-' + Date.now(),
        name: `Workout - ${dateDisplay || 'Custom'}`,
        exercises: selectedExerciseData.map((exercise, exerciseIndex) => {
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
        }),
      };

      // Navigate to LogWorkout screen
      navigation.navigate('LogWorkout', {
        workout: customWorkout,
        date: date,
        dateDisplay: dateDisplay,
        isCustom: true,
      });
      
      return;
    }
    
    // Original behavior for regular workout creation
    if (route.params?.onExercisesSelected) {
      route.params.onExercisesSelected(selectedExerciseData);
    }
    
    navigation.goBack();
  };

  // Render exercise item
  const renderExerciseItem = ({ item }: { item: Exercise }) => {
    const isSelected = selectedExercises.has(item.id);
    const muscleText = item.muscle_groups?.join(', ') || 'No muscles specified';

    return (
      <TouchableOpacity
        style={styles.exerciseItem}
        onPress={() => toggleExerciseSelection(item.id)}
        activeOpacity={0.7}
      >
        {/* Exercise thumbnail placeholder */}
        <View style={styles.exerciseThumbnail}>
          <Ionicons name="fitness" size={24} color="#17D4D4" />
        </View>

        {/* Exercise info */}
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{item.name}</Text>
          <Text style={styles.exerciseMuscles}>{muscleText}</Text>
        </View>

        {/* Checkbox */}
        <View style={styles.checkbox}>
          {isSelected ? (
            <View style={styles.checkboxSelected}>
              <Ionicons name="checkmark" size={14} color="#17D4D4" />
            </View>
          ) : (
            <View style={styles.checkboxUnselected} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render muscle bubble for modals
  const renderMuscleBubble = (muscle: string, isSelected: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={muscle}
      style={[styles.muscleBubble, isSelected && styles.muscleBubbleSelected]}
      onPress={onPress}
    >
      <Text style={[styles.muscleBubbleText, isSelected && styles.muscleBubbleTextSelected]}>
        {muscle}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </TouchableOpacity>
        
        <Text style={styles.title}>
          {isCreateLogMode ? 'Create Custom Workout' : 
           isAddToLogMode ? 'Add Exercises' : 
           'Exercise Library'}
        </Text>
        
        <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add" size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      {/* Subtitle for create_log mode */}
      {(isCreateLogMode || isAddToLogMode) && route.params?.dateDisplay && (
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitle}>
            {isCreateLogMode 
              ? `Creating workout for ${route.params.dateDisplay}`
              : `Adding exercises for ${route.params.dateDisplay}`
            }
          </Text>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercise name"
          placeholderTextColor="#AAAAAA"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter */}
      <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
        <Ionicons name="funnel" size={20} color="#000000" />
        <Text style={styles.filterText}>Filter</Text>
        {selectedFilters.size > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{selectedFilters.size}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Exercise List */}
      <FlatList
        data={filteredExercises}
        renderItem={renderExerciseItem}
        keyExtractor={(item) => item.id}
        style={styles.exerciseList}
        contentContainerStyle={styles.exerciseListContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Add to Workout Button */}
      <View style={styles.addToWorkoutContainer}>
        <TouchableOpacity
          style={[
            styles.addToWorkoutButton,
            selectedExercises.size === 0 && styles.addToWorkoutButtonDisabled
          ]}
          onPress={handleAddToWorkout}
          disabled={selectedExercises.size === 0}
        >
          <Text style={styles.addToWorkoutText}>
            {isCreateLogMode 
              ? `Create Workout (${selectedExercises.size})` 
              : isAddToLogMode
              ? `Add Exercises (${selectedExercises.size})`
              : `Add to Workout (${selectedExercises.size})`
            }
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#999999" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalTitle}>Filter by Muscle Groups</Text>
            
            <View style={styles.muscleBubbleContainer}>
              {availableMuscles.map(muscle =>
                renderMuscleBubble(
                  muscle,
                  selectedFilters.has(muscle.toLowerCase()),
                  () => toggleMuscleFilter(muscle.toLowerCase())
                )
              )}
            </View>
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Clear Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Custom Exercise Modal */}
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#999999" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalTitle}>Create Custom Exercise</Text>
            
            <Text style={styles.inputLabel}>Input</Text>
            <TextInput
              style={styles.exerciseNameInput}
              placeholder="Enter exercise name"
              placeholderTextColor="#AAAAAA"
              value={customExerciseName}
              onChangeText={setCustomExerciseName}
            />
            
            <View style={styles.muscleBubbleContainer}>
              {availableMuscles.filter(m => m !== 'CUSTOM').map(muscle =>
                renderMuscleBubble(
                  muscle,
                  selectedMusclesForCustom.has(muscle.toLowerCase()),
                  () => toggleMuscleForCustom(muscle.toLowerCase())
                )
              )}
            </View>
            
            <TouchableOpacity style={styles.createExerciseButton} onPress={createCustomExercise}>
              <Text style={styles.createExerciseButtonText}>Create Exercise</Text>
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
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-ExtraBold',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 4,
  },
  
  // NEW: Subtitle for create_log mode
  subtitleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#17D4D4',
    textAlign: 'center',
  },
  
  // Search
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchInput: {
    height: 44,
    backgroundColor: '#F1F1F1',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
  },
  
  // Filter
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#000000',
    marginLeft: 8,
  },
  filterBadge: {
    backgroundColor: '#17D4D4',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  filterBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  
  // Exercise List
  exerciseList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  exerciseListContent: {
    paddingBottom: 120, // Space for button
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  exerciseThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    marginBottom: 2,
  },
  exerciseMuscles: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#6B6B6B',
  },
  checkbox: {
    marginLeft: 12,
  },
  checkboxSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DFFCFD',
    borderWidth: 2,
    borderColor: '#17D4D4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxUnselected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
  },
  
  // Add to Workout Button
  addToWorkoutContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  addToWorkoutButton: {
    backgroundColor: '#17D4D4',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToWorkoutButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  addToWorkoutText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 24,
  },
  
  // Input for custom exercise
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#AAAAAA',
    marginBottom: 8,
  },
  exerciseNameInput: {
    height: 48,
    backgroundColor: '#F1F1F1',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
    marginBottom: 24,
  },
  
  // Muscle Bubbles
  muscleBubbleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 8,
  },
  muscleBubble: {
    backgroundColor: '#F1F1F1',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  muscleBubbleSelected: {
    backgroundColor: '#DFFCFD',
    borderColor: '#17D4D4',
  },
  muscleBubbleText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#666666',
  },
  muscleBubbleTextSelected: {
    color: '#17D4D4',
  },
  
  // Modal Buttons
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  clearButton: {
    backgroundColor: '#F1F1F1',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  clearButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#666666',
  },
  createExerciseButton: {
    backgroundColor: '#17D4D4',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createExerciseButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
});

export default ExerciseLibraryScreen;