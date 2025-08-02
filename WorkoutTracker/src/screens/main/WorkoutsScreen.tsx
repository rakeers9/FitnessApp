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
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import ScheduleWorkoutModal from '../../components/ScheduleWorkoutModal';
import { getUnreadNotificationCount } from '../../services/notifications';

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
  thumbnail_url?: string | null;
  scheduled_days?: string[];
}

const formatScheduledDays = (days: string[] = []): string => {
  if (days.length === 0) return '';
  if (days.length === 7) return 'Every Day';
  
  const dayAbbreviations: { [key: string]: string } = {
    'Monday': 'Mon',
    'Tuesday': 'Tue', 
    'Wednesday': 'Wed',
    'Thursday': 'Thu',
    'Friday': 'Fri',
    'Saturday': 'Sat',
    'Sunday': 'Sun',
  };
  
  return days.map(day => dayAbbreviations[day] || day).join(', ');
};

const WorkoutsScreen: React.FC<WorkoutsScreenProps> = ({ navigation }) => {
  const [workouts, setWorkouts] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulingWorkout, setSchedulingWorkout] = useState<WorkoutTemplate | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // FIXED: Single useFocusEffect that loads both workouts and unread count
  useFocusEffect(
    React.useCallback(() => {
      loadWorkouts();
      loadUnreadCount();
    }, [])
  );

  const loadUnreadCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const count = await getUnreadNotificationCount(user.id);
      setUnreadCount(count);
    }
  };

  const loadWorkouts = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found, cannot load workouts');
        return;
      }

      // Load workout templates for this user
      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Database error loading workouts:', error);
        return;
      }

      if (!data || data.length === 0) {
        console.log('No workouts found in database');
        setWorkouts([]);
        return;
      }

      // Transform data with proper typing
      const transformedWorkouts: WorkoutTemplate[] = data.map((template) => {
        // Calculate exercise count from exercises JSONB array
        const exerciseCount = Array.isArray(template.exercises) ? template.exercises.length : 0;
        
        // Calculate estimated duration (rough estimate: 5 mins per exercise)
        const estimatedDuration = exerciseCount * 5;

        return {
          id: template.id as string,
          name: template.name as string,
          duration_minutes: estimatedDuration,
          exercise_count: exerciseCount,
          thumbnail_url: null, // Explicitly null for now
          scheduled_days: template.scheduled_days || [],
        };
      });

      console.log(`Loaded ${transformedWorkouts.length} workouts from database`);
      setWorkouts(transformedWorkouts);
    } catch (error) {
      console.error('Error in loadWorkouts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle create workout button
  const handleCreateWorkout = () => {
    navigation.navigate('EditWorkout', { workout: null }); // Explicitly pass null for new workout
  };

  // Handle notifications button
  const handleNotifications = () => {
    navigation.navigate('Notifications');
  };

  // Handle workout card press
  const handleWorkoutPress = (workout: WorkoutTemplate) => {
    navigation.navigate('EditWorkout', { workout });
  };

  // Handle workout menu (3-dots)
  const handleWorkoutMenu = (workout: WorkoutTemplate, event?: any) => {
  // Prevent card tap when menu is tapped
  if (event) {
    event.stopPropagation();
  }
  
  Alert.alert(
    workout.name,
    'Choose an option:',
    [
      { 
        text: 'Rename Workout', 
        onPress: () => handleRenameWorkout(workout)
      },
      { 
        text: 'Schedule Workout', 
        onPress: () => {
          setSchedulingWorkout(workout);
          setShowScheduleModal(true);
        }
      },
      { 
        text: 'Delete Workout', 
        style: 'destructive',
        onPress: () => handleDeleteWorkout(workout)
      },
      { text: 'Cancel', style: 'cancel' },
    ]
  );
};

// Add this new function after handleWorkoutMenu:
const handleRenameWorkout = (workout: WorkoutTemplate) => {
  Alert.prompt(
    'Rename Workout',
    'Enter a new name for this workout:',
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Save', 
        onPress: async (newName) => {
          if (!newName || newName.trim() === '') {
            Alert.alert('Error', 'Workout name cannot be empty');
            return;
          }

          try {
            const { error } = await supabase
              .from('workout_templates')
              .update({ name: newName.trim() })
              .eq('id', workout.id);

            if (error) {
              console.error('Error renaming workout:', error);
              Alert.alert('Error', 'Failed to rename workout. Please try again.');
              return;
            }

            // Reload workouts to show the change
            await loadWorkouts();
            Alert.alert('Success', 'Workout renamed successfully');
          } catch (error) {
            console.error('Error in handleRenameWorkout:', error);
            Alert.alert('Error', 'Failed to rename workout. Please try again.');
          }
        }
      },
    ],
    'plain-text',
    workout.name
  );
};

  // Handle delete workout
const handleDeleteWorkout = (workout: WorkoutTemplate) => {
  Alert.alert(
    'Delete Workout',
    `Are you sure you want to delete "${workout.name}"? This action cannot be undone.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            console.log('Deleting workout:', workout.id);
            
            const { error } = await supabase
              .from('workout_templates')
              .update({ is_active: false })
              .eq('id', workout.id);

            if (error) {
              console.error('Error deleting workout:', error);
              Alert.alert('Error', 'Failed to delete workout. Please try again.');
              return;
            }

            console.log('Workout deleted successfully');
            
            // FORCE reload workouts from database instead of just updating state
            // await loadWorkouts();
            
            Alert.alert('Success', 'Workout deleted successfully');
          } catch (error) {
            console.error('Error in handleDeleteWorkout:', error);
            Alert.alert('Error', 'Failed to delete workout. Please try again.');
          }
        }
      },
    ]
  );
};
  const handleScheduleSave = async (selectedDays: string[]) => {
  if (!schedulingWorkout) return;

  try {
    console.log('Updating workout schedule for ID:', schedulingWorkout.id);
    console.log('Selected days:', selectedDays);

    const { error } = await supabase
      .from('workout_templates')
      .update({ scheduled_days: selectedDays })
      .eq('id', schedulingWorkout.id);

    if (error) {
      console.error('Database error updating schedule:', error);
      Alert.alert('Error', `Failed to update workout schedule: ${error.message}`);
      return;
    }

    console.log('Schedule updated successfully');

    // FORCE reload workouts to ensure UI is in sync
    await loadWorkouts();

    Alert.alert('Success', 'Workout schedule updated successfully');
  } catch (error) {
    console.error('Error in handleScheduleSave:', error);
    Alert.alert('Error', 'Failed to update workout schedule. Please try again.');
  }
};
  // Render individual workout card
  const renderWorkoutCard = ({ item }: { item: WorkoutTemplate }) => {
    const scheduledText = formatScheduledDays(item.scheduled_days);
    
    return (
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
          <View style={styles.titleRow}>
            <Text style={styles.workoutTitle}>{item.name}</Text>
            {scheduledText && (
              <Text style={styles.scheduledText}>{scheduledText}</Text>
            )}
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#5A5A5A" />
            <Text style={styles.infoText}>{item.duration_minutes || 0} mins</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="link-outline" size={16} color="#5A5A5A" />
            <Text style={styles.infoText}>{item.exercise_count || 0} exercises</Text>
          </View>
        </View>

        {/* 3-Dots Menu Button */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={(event) => handleWorkoutMenu(item, event)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="#000000" />
        </TouchableOpacity>

        {/* Arrow Icon */}
        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
        </View>
      </TouchableOpacity>
    );
  };

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
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
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
      
      {/* Schedule Workout Modal */}
      <ScheduleWorkoutModal
        visible={showScheduleModal}
        currentSchedule={schedulingWorkout?.scheduled_days || []}
        workoutName={schedulingWorkout?.name || ''}
        onClose={() => {
          setShowScheduleModal(false);
          setSchedulingWorkout(null);
        }}
        onSave={handleScheduleSave}
      />
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
    padding: 4,
    position: 'relative', // Add this for badge positioning
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
    position: 'relative',
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
    marginTop: 40,
    marginRight: 5,
  },
  
  // Menu Button
  menuButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  scheduledText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#888888',
    marginLeft: 8,
  },
  
  // Notification Badge
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF3B3B',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
});

export default WorkoutsScreen;


