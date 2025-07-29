// src/screens/main/WorkoutsScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../../services/supabase';

// Navigation props type
type WorkoutsScreenProps = {
  navigation: StackNavigationProp<any>;
};

// Updated workout data type with proper typing
interface WorkoutTemplate {
  id: string;
  name: string;
  duration_minutes?: number;
  exercise_count?: number;
  thumbnail_url?: string | null; // Allow null values
}

const WorkoutsScreen: React.FC<WorkoutsScreenProps> = ({ navigation }) => {
  const [workouts, setWorkouts] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Load workouts from database
  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load workout templates for this user
      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading workouts:', error);
        return;
      }

      // Transform data with proper typing
      const transformedWorkouts: WorkoutTemplate[] = data?.map(template => ({
        id: template.id as string,
        name: template.name as string,
        duration_minutes: 122, // Placeholder - we'll calculate this later
        exercise_count: Array.isArray(template.exercises) ? template.exercises.length : 0,
        thumbnail_url: null, // Explicitly null for now
      })) || [];

      setWorkouts(transformedWorkouts);
    } catch (error) {
      console.error('Error in loadWorkouts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle create workout button
  const handleCreateWorkout = () => {
    navigation.navigate('EditWorkout', { workout: null }); // null for new workout
  };

  // Handle notifications button
  const handleNotifications = () => {
    Alert.alert('Notifications', 'Notifications screen coming soon!');
  };

  // Handle workout card press
  const handleWorkoutPress = (workout: WorkoutTemplate) => {
    navigation.navigate('EditWorkout', { workout });
  };

  // Render individual workout card
  const renderWorkoutCard = ({ item }: { item: WorkoutTemplate }) => (
    <TouchableOpacity
      style={styles.workoutCard}
      onPress={() => handleWorkoutPress(item)}
      activeOpacity={0.95}
    >
      {/* Thumbnail Image */}
      <View style={styles.thumbnailContainer}>
        {item.thumbnail_url ? (
          <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
            <Ionicons name="fitness" size={32} color="#17D4D4" />
          </View>
        )}
      </View>

      {/* Content Section */}
      <View style={styles.cardContent}>
        <Text style={styles.workoutTitle}>{item.name}</Text>
        
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color="#5A5A5A" />
          <Text style={styles.infoText}>{item.duration_minutes || 0} mins</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Ionicons name="link-outline" size={16} color="#5A5A5A" />
          <Text style={styles.infoText}>{item.exercise_count || 0} exercises</Text>
        </View>
      </View>

      {/* Arrow Icon */}
      <View style={styles.arrowContainer}>
        <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
      </View>
    </TouchableOpacity>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyMessage}>Oh HELL nah you aint got no workouts...</Text>
      <TouchableOpacity style={styles.ctaButton} onPress={handleCreateWorkout}>
        <Text style={styles.ctaButtonText}>Create a Workout</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Workouts</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleCreateWorkout}
          >
            <Ionicons name="add" size={24} color="#000000" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleNotifications}
          >
            <Ionicons name="notifications-outline" size={24} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading workouts...</Text>
        </View>
      ) : workouts.length > 0 ? (
        <FlatList
          data={workouts}
          renderItem={renderWorkoutCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        renderEmptyState()
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
    paddingTop: 16,
    paddingBottom: 20,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Poppins-ExtraBold',
    color: '#000000',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 12,
    padding: 4, // Add touch area
  },
  
  // Workout Cards
  listContainer: {
    paddingHorizontal: 20,
  },
  workoutCard: {
    backgroundColor: '#DFFCFD',
    borderRadius: 20,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  thumbnailContainer: {
    marginRight: 12,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  placeholderThumbnail: {
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  workoutTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#5A5A5A',
    marginLeft: 6,
  },
  arrowContainer: {
    paddingLeft: 8,
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: -100, // Move it up a bit to account for header
  },
  emptyMessage: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  ctaButton: {
    backgroundColor: '#17D4D4',
    borderRadius: 24,
    paddingHorizontal: 32,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    width: 240,
  },
  ctaButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#5A5A5A',
  },
});

export default WorkoutsScreen;