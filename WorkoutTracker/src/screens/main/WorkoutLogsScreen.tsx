// src/screens/main/WorkoutLogsScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { supabase } from '../../services/supabase';

// Types
type WorkoutLogsScreenProps = {
  navigation: StackNavigationProp<any>;
  route: RouteProp<any>;
};

interface WorkoutSession {
  id: string;
  workout_name: string;
  duration_minutes: number;
  total_volume: number;
  completed_at: string;
  created_at: string;
  template_id?: string;
}

interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  exercises: any[];
  estimated_duration?: number;
}

const WorkoutLogsScreen: React.FC<WorkoutLogsScreenProps> = ({ navigation, route }) => {
  // Get date info from route params (with safe defaults)
  const { date, dateDisplay, sessions: initialSessions } = route.params || {};
  
  const [sessions, setSessions] = useState<WorkoutSession[]>(initialSessions || []);
  const [availableWorkouts, setAvailableWorkouts] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showWorkoutList, setShowWorkoutList] = useState(false);

  useEffect(() => {
    if (!date || !dateDisplay) {
      Alert.alert('Error', 'Date information is required', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
      return;
    }
    loadAvailableWorkouts();
    // Refresh sessions data to get latest
    refreshSessionsData();
  }, [date, dateDisplay, navigation]);

  // Load available workout templates
  const loadAvailableWorkouts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading workout templates:', error);
        return;
      }

      setAvailableWorkouts(data || []);
    } catch (error) {
      console.error('Error in loadAvailableWorkouts:', error);
    }
  };

  // Refresh sessions data
  const refreshSessionsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('date_performed', date)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Error refreshing sessions:', error);
        return;
      }

      setSessions(data || []);
    } catch (error) {
      console.error('Error in refreshSessionsData:', error);
    }
  };

  // Navigation handlers
  const handleBack = () => {
    navigation.goBack();
  };

  const handleAddLogs = () => {
    setShowWorkoutList(true);
  };

  // Handle selecting an existing workout to log
  const handleSelectWorkout = (workout: WorkoutTemplate) => {
    setShowWorkoutList(false);
    navigation.navigate('LogWorkout', {
      workout: workout,
      date: date,
      dateDisplay: dateDisplay,
      onWorkoutSaved: refreshSessionsData,
    });
  };

  // Handle creating custom workout log
  const handleAddCustomWorkout = () => {
    setShowWorkoutList(false);
    navigation.navigate('ExerciseLibrary', {
      mode: 'create_log', // Special mode for creating workout logs
      date: date,
      dateDisplay: dateDisplay,
      onExercisesSelected: (exercises: any[]) => {
        // Navigate to log workout screen with custom workout
        const customWorkout = {
          id: 'custom-' + Date.now(),
          name: `Workout - ${dateDisplay}`,
          exercises: exercises,
        };
        navigation.navigate('LogWorkout', {
          workout: customWorkout,
          date: date,
          dateDisplay: dateDisplay,
          isCustom: true,
          onWorkoutSaved: refreshSessionsData,
        });
      },
    });
  };

  // Handle viewing existing session details
  const handleViewSession = (session: WorkoutSession) => {
    navigation.navigate('ViewWorkoutSession', {
      sessionId: session.id,
      sessionName: session.workout_name,
      date: date,
      dateDisplay: dateDisplay,
    });
  };

  // Format duration
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Render workout session item
  const renderSessionItem = ({ item }: { item: WorkoutSession }) => (
    <TouchableOpacity
      style={styles.sessionCard}
      onPress={() => handleViewSession(item)}
      activeOpacity={0.7}
    >
      {/* Session Icon */}
      <View style={styles.sessionIcon}>
        <Ionicons name="fitness" size={24} color="#17D4D4" />
      </View>

      {/* Session Info */}
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionName}>{item.workout_name}</Text>
        <View style={styles.sessionMetaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color="#6E6E6E" />
            <Text style={styles.metaText}>{formatDuration(item.duration_minutes)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="barbell-outline" size={14} color="#6E6E6E" />
            <Text style={styles.metaText}>{Math.round(item.total_volume)}kg</Text>
          </View>
        </View>
      </View>

      {/* Arrow */}
      <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
    </TouchableOpacity>
  );

  // Render available workout item for selection
  const renderWorkoutItem = ({ item }: { item: WorkoutTemplate }) => (
    <TouchableOpacity
      style={styles.workoutCard}
      onPress={() => handleSelectWorkout(item)}
      activeOpacity={0.7}
    >
      {/* Workout Icon */}
      <View style={styles.workoutIcon}>
        <Ionicons name="fitness" size={24} color="#17D4D4" />
      </View>

      {/* Workout Info */}
      <View style={styles.workoutInfo}>
        <Text style={styles.workoutName}>{item.name}</Text>
        <Text style={styles.workoutDescription}>
          {item.exercises?.length || 0} exercises • {item.estimated_duration || 0} mins
        </Text>
      </View>

      {/* Arrow */}
      <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Show workout list modal or main content */}
      {showWorkoutList ? (
        <View style={styles.workoutListContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => setShowWorkoutList(false)}>
              <Ionicons name="chevron-back" size={24} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.title}>Add Workout Log</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Date info */}
          <View style={styles.dateSection}>
            <Text style={styles.dateText}>Adding log for {dateDisplay}</Text>
          </View>

          {/* Available Workouts */}
          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {availableWorkouts.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Your Workouts</Text>
                <FlatList
                  data={availableWorkouts}
                  renderItem={renderWorkoutItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              </>
            )}

            {/* Add Custom Workout Option */}
            <TouchableOpacity style={styles.addCustomButton} onPress={handleAddCustomWorkout}>
              <View style={styles.addCustomIcon}>
                <Ionicons name="add" size={32} color="#17D4D4" />
              </View>
              <Text style={styles.addCustomText}>Add Custom Workout</Text>
            </TouchableOpacity>

            <View style={styles.bottomSpacing} />
          </ScrollView>
        </View>
      ) : (
        // Main logs view
        <>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="chevron-back" size={24} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.title}>Workout Logs</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Date Section */}
          <View style={styles.dateSection}>
            <Text style={styles.dateText}>{dateDisplay}</Text>
          </View>

          {/* Content */}
          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {sessions.length > 0 ? (
              // Show existing sessions
              <>
                <Text style={styles.sectionTitle}>
                  {sessions.length} Workout{sessions.length > 1 ? 's' : ''} Completed
                </Text>
                <FlatList
                  data={sessions}
                  renderItem={renderSessionItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              </>
            ) : (
              // Empty state
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={64} color="#CCCCCC" />
                <Text style={styles.emptyTitle}>No Logs for This Day</Text>
                <Text style={styles.emptySubtitle}>
                  Add a workout log to track your progress
                </Text>
              </View>
            )}

            <View style={styles.bottomSpacing} />
          </ScrollView>

          {/* Add Logs Button (Always visible) */}
          <View style={styles.addLogsContainer}>
            <TouchableOpacity style={styles.addLogsButton} onPress={handleAddLogs}>
              <Text style={styles.addLogsText}>Add Logs</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // Header
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
  headerSpacer: {
    width: 32, // Same width as back button for balance
  },
  
  // Date Section
  dateSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#17D4D4',
  },
  
  // Content
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    marginBottom: 16,
  },
  
  // Session Cards
  sessionCard: {
    backgroundColor: '#DFFCFD',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
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
  sessionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  sessionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#6E6E6E',
    marginLeft: 4,
  },
  
  // Workout Selection Cards
  workoutListContainer: {
    flex: 1,
  },
  workoutCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    marginBottom: 2,
  },
  workoutDescription: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#6E6E6E',
  },
  
  // Add Custom Workout Button
  addCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  addCustomIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DFFCFD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  addCustomText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#666666',
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#6E6E6E',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Add Logs Button
  addLogsContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  addLogsButton: {
    backgroundColor: '#17D4D4',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addLogsText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  
  bottomSpacing: {
    height: 100, // Space for button
  },
});

export default WorkoutLogsScreen;