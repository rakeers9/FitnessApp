// src/screens/main/ProfileScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { StackNavigationProp } from '@react-navigation/stack';

// Get screen dimensions for responsive design
const { width: screenWidth } = Dimensions.get('window');

// Types for navigation
type ProfileScreenProps = {
  navigation: StackNavigationProp<any>;
};

// Types for user profile data
interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  unit_preference: 'kg' | 'lb';
}

// Types for workout session data (for calendar highlighting)
interface WorkoutSession {
  id: string;
  date_performed: string;
  duration_minutes: number;
  total_volume: number;
  workout_name: string;
}

// Types for analytics data
interface WeeklyAnalytics {
  week: string;
  volume: number;
  duration: number;
}

interface MuscleGroupAnalytics {
  muscle_group: string;
  sessions: number;
  percentage: number;
}

// Types for calendar component
interface CalendarProps {
  currentMonth: Date;
  workoutSessions: WorkoutSession[];
  onMonthChange: (date: Date) => void;
  navigation: StackNavigationProp<any>;
}

// Custom Calendar Component
const CalendarComponent: React.FC<CalendarProps> = ({
  currentMonth,
  workoutSessions,
  onMonthChange,
  navigation,
}) => {
  // Get calendar data for current month
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Days to show from previous month
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Generate 42 days (6 weeks)
    const days = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  // Check if a date has workout sessions
  const hasWorkoutOnDate = (date: Date): boolean => {
    const dateString = date.toISOString().split('T')[0];
    return workoutSessions.some(session => session.date_performed === dateString);
  };

  // Check if date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Check if date is in current month
  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentMonth.getMonth();
  };

  // Navigation handlers
  const goToPreviousMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    onMonthChange(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    onMonthChange(newDate);
  };

  const monthName = currentMonth.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const calendarDays = getCalendarDays();

  return (
    <View style={styles.calendar}>
      {/* Calendar Header */}
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={goToPreviousMonth} style={styles.monthNavButton}>
          <Ionicons name="chevron-back" size={20} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.monthText}>{monthName}</Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.monthNavButton}>
          <Ionicons name="chevron-forward" size={20} color="#000000" />
        </TouchableOpacity>
      </View>

      {/* Weekdays Header */}
      <View style={styles.weekdaysRow}>
        {weekDays.map((day, index) => (
          <Text key={index} style={styles.weekdayText}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((date, index) => {
          const hasWorkout = hasWorkoutOnDate(date);
          const today = isToday(date);
          const currentMonth = isCurrentMonth(date);

          return (
            <TouchableOpacity
              key={index}
              style={styles.calendarDay}
              onPress={() => {
                // Navigate to workout logs for this date
                if (hasWorkout) {
                  const sessionsOnDate = workoutSessions.filter(
                    s => s.date_performed === date.toISOString().split('T')[0]
                  );
                  navigation.navigate('WorkoutLogs', {
                    date: date.toISOString().split('T')[0],
                    dateDisplay: date.toLocaleDateString(),
                    sessions: sessionsOnDate,
                  });
                } else {
                  // No workouts on this date, go to logs screen anyway
                  navigation.navigate('WorkoutLogs', {
                    date: date.toISOString().split('T')[0],
                    dateDisplay: date.toLocaleDateString(),
                    sessions: [],
                  });
                }
              }}
            >
              <View
                style={[
                  styles.dateContainer,
                  hasWorkout && styles.workoutDate,
                  today && !hasWorkout && styles.todayDate,
                ]}
              >
                <Text
                  style={[
                    styles.dateText,
                    !currentMonth && styles.otherMonthDate,
                    hasWorkout && styles.workoutDateText,
                    today && !hasWorkout && styles.todayDateText,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#17D4D4' }]} />
          <Text style={styles.legendText}>Workout completed</Text>
        </View>
      </View>
    </View>
  );
};

// Simple Analytics Components (React Native Compatible)
interface AnalyticsProps {
  weeklyAnalytics: WeeklyAnalytics[];
  muscleAnalytics: MuscleGroupAnalytics[];
}

const AnalyticsSection: React.FC<AnalyticsProps> = ({
  weeklyAnalytics,
  muscleAnalytics,
}) => {
  // Find max values for scaling
  const maxVolume = Math.max(...weeklyAnalytics.map(w => w.volume), 1);
  const maxDuration = Math.max(...weeklyAnalytics.map(w => w.duration), 1);

  // Colors for muscle groups
  const accentColors = ['#17D4D4', '#0D9488', '#06B6D4', '#0891B2', '#0E7490', '#155E75'];

  return (
    <View style={styles.analyticsContainer}>
      <Text style={styles.sectionTitle}>Analytics</Text>
      
      {/* Weekly Volume Chart - Simple Bar Chart */}
      {weeklyAnalytics.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Weekly Volume (kg)</Text>
          <View style={styles.simpleBarChart}>
            {weeklyAnalytics.map((week, index) => (
              <View key={index} style={styles.barContainer}>
                <View style={styles.barColumn}>
                  <View 
                    style={[
                      styles.bar,
                      { 
                        height: Math.max((week.volume / maxVolume) * 80, 4), // Min height 4
                        backgroundColor: '#17D4D4' 
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.barLabel}>{week.week}</Text>
                <Text style={styles.barValue}>{week.volume}kg</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Weekly Duration Chart - Simple Line-style Chart */}
      {weeklyAnalytics.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Weekly Duration (minutes)</Text>
          <View style={styles.simpleLineChart}>
            {weeklyAnalytics.map((week, index) => (
              <View key={index} style={styles.linePoint}>
                <View 
                  style={[
                    styles.lineDot,
                    { 
                      bottom: (week.duration / maxDuration) * 60, // Scale to 60px height
                      backgroundColor: '#0D9488' 
                    }
                  ]} 
                />
                <Text style={styles.lineLabel}>{week.week}</Text>
                <Text style={styles.lineValue}>{week.duration}min</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Muscle Group Breakdown - Simple Progress Bars */}
      {muscleAnalytics.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Muscle Group Breakdown (Last 30 Days)</Text>
          <View style={styles.muscleBreakdown}>
            {muscleAnalytics.slice(0, 6).map((muscle, index) => (
              <View key={index} style={styles.muscleRow}>
                <Text style={styles.muscleName}>{muscle.muscle_group}</Text>
                <View style={styles.muscleProgressContainer}>
                  <View 
                    style={[
                      styles.muscleProgress,
                      { 
                        width: `${muscle.percentage}%`,
                        backgroundColor: accentColors[index % accentColors.length]
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.musclePercentage}>{muscle.percentage}%</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Empty State */}
      {weeklyAnalytics.length === 0 && muscleAnalytics.length === 0 && (
        <View style={styles.emptyAnalyticsContainer}>
          <Ionicons name="bar-chart-outline" size={48} color="#CCCCCC" />
          <Text style={styles.emptyAnalyticsTitle}>No Data Yet</Text>
          <Text style={styles.emptyAnalyticsText}>
            Complete some workouts to see your analytics here!
          </Text>
        </View>
      )}
    </View>
  );
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  // State for user profile
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // State for calendar data
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // State for analytics
  const [weeklyAnalytics, setWeeklyAnalytics] = useState<WeeklyAnalytics[]>([]);
  const [muscleAnalytics, setMuscleAnalytics] = useState<MuscleGroupAnalytics[]>([]);
  
  // Load data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadProfileData();
      loadWorkoutSessions();
      loadAnalyticsData();
    }, [])
  );

  // Load user profile data
  const loadProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        return;
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      if (profileData) {
        setProfile({
          id: profileData.id,
          full_name: profileData.full_name || 'User',
          email: profileData.email || user.email || '',
          avatar_url: profileData.avatar_url,
          unit_preference: profileData.unit_preference || 'kg',
        });
      }
    } catch (error) {
      console.error('Error in loadProfileData:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load workout sessions for calendar highlighting
  const loadWorkoutSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get last 3 months of workout sessions
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const { data, error } = await supabase
        .from('workout_sessions')
        .select('id, date_performed, duration_minutes, total_volume, workout_name')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null) // Only completed workouts
        .gte('date_performed', threeMonthsAgo.toISOString().split('T')[0])
        .order('date_performed', { ascending: false });

      if (error) {
        console.error('Error loading workout sessions:', error);
        return;
      }

      if (data) {
        setWorkoutSessions(data);
        console.log(`Loaded ${data.length} workout sessions for calendar`);
      }
    } catch (error) {
      console.error('Error in loadWorkoutSessions:', error);
    }
  };

  // Load analytics data
  const loadAnalyticsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load weekly analytics for last 8 weeks
      await loadWeeklyAnalytics(user.id);
      
      // Load muscle group analytics for last 30 days
      await loadMuscleGroupAnalytics(user.id);
    } catch (error) {
      console.error('Error in loadAnalyticsData:', error);
    }
  };

  // Load weekly volume and duration analytics
  const loadWeeklyAnalytics = async (userId: string) => {
    try {
      // Get last 8 weeks of data
      const eightWeeksAgo = new Date();
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56); // 8 weeks * 7 days

      const { data, error } = await supabase
        .from('workout_sessions')
        .select('date_performed, duration_minutes, total_volume')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .gte('date_performed', eightWeeksAgo.toISOString().split('T')[0])
        .order('date_performed', { ascending: true });

      if (error) {
        console.error('Error loading weekly analytics:', error);
        return;
      }

      if (data && data.length > 0) {
        // Group by week and calculate totals
        const weeklyData = groupSessionsByWeek(data);
        setWeeklyAnalytics(weeklyData);
        console.log(`Loaded weekly analytics: ${weeklyData.length} weeks`);
      }
    } catch (error) {
      console.error('Error in loadWeeklyAnalytics:', error);
    }
  };

  // Load muscle group breakdown analytics
  const loadMuscleGroupAnalytics = async (userId: string) => {
    try {
      // Get last 30 days of workout sessions
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('id, date_performed')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .gte('date_performed', thirtyDaysAgo.toISOString().split('T')[0]);

      if (sessionsError) {
        console.error('Error loading sessions for muscle analytics:', sessionsError);
        return;
      }

      if (!sessions || sessions.length === 0) {
        console.log('No sessions found for muscle analytics');
        return;
      }

      const sessionIds = sessions.map(s => s.id);

      // Get workout sets for these sessions
      const { data: sets, error: setsError } = await supabase
        .from('workout_sets')
        .select('exercise_id')
        .in('session_id', sessionIds);

      if (setsError) {
        console.error('Error loading sets for muscle analytics:', setsError);
        return;
      }

      if (!sets || sets.length === 0) {
        console.log('No sets found for muscle analytics');
        return;
      }

      const exerciseIds = [...new Set(sets.map(s => s.exercise_id))];

      // Get exercises with muscle groups
      const { data: exercises, error: exercisesError } = await supabase
        .from('exercises')
        .select('id, muscle_groups')
        .in('id', exerciseIds);

      if (exercisesError) {
        console.error('Error loading exercises for muscle analytics:', exercisesError);
        return;
      }

      if (exercises && exercises.length > 0) {
        // Calculate muscle group breakdown
        const muscleData = calculateMuscleGroupBreakdownFromData(exercises, sets);
        setMuscleAnalytics(muscleData);
        console.log(`Loaded muscle analytics: ${muscleData.length} muscle groups`);
      }
    } catch (error) {
      console.error('Error in loadMuscleGroupAnalytics:', error);
    }
  };

  // Helper function to group sessions by week
  const groupSessionsByWeek = (sessions: any[]): WeeklyAnalytics[] => {
    const weeklyMap = new Map<string, { volume: number; duration: number }>();

    sessions.forEach(session => {
      const date = new Date(session.date_performed);
      // Get start of week (Sunday)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      const existing = weeklyMap.get(weekKey) || { volume: 0, duration: 0 };
      weeklyMap.set(weekKey, {
        volume: existing.volume + (session.total_volume || 0),
        duration: existing.duration + (session.duration_minutes || 0),
      });
    });

    // Convert to array and format for chart
    return Array.from(weeklyMap.entries())
      .map(([week, data]) => ({
        week: formatWeekLabel(week),
        volume: Math.round(data.volume),
        duration: data.duration,
      }))
      .slice(-8); // Last 8 weeks only
  };

  // Helper function to calculate muscle group breakdown from separate data
  const calculateMuscleGroupBreakdownFromData = (exercises: any[], sets: any[]): MuscleGroupAnalytics[] => {
    const muscleCount = new Map<string, number>();
    let totalSessions = 0;

    // Create a map of exercise_id to muscle_groups
    const exerciseMuscleMap = new Map<string, string[]>();
    exercises.forEach(exercise => {
      if (exercise.muscle_groups && Array.isArray(exercise.muscle_groups)) {
        exerciseMuscleMap.set(exercise.id, exercise.muscle_groups);
      }
    });

    // Count muscle group usage from sets
    sets.forEach(set => {
      const muscleGroups = exerciseMuscleMap.get(set.exercise_id);
      if (muscleGroups) {
        muscleGroups.forEach((muscle: string) => {
          muscleCount.set(muscle, (muscleCount.get(muscle) || 0) + 1);
          totalSessions++;
        });
      }
    });

    if (totalSessions === 0) {
      return [];
    }

    // Convert to percentage breakdown
    return Array.from(muscleCount.entries())
      .map(([muscle, count]) => ({
        muscle_group: muscle,
        sessions: count,
        percentage: Math.round((count / totalSessions) * 100),
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 6); // Top 6 muscle groups
  };

  // Helper function to calculate muscle group breakdown (old version - keeping for compatibility)
  const calculateMuscleGroupBreakdown = (sessions: any[]): MuscleGroupAnalytics[] => {
    const muscleCount = new Map<string, number>();
    let totalSessions = 0;

    sessions.forEach(session => {
      if (session.workout_sets) {
        session.workout_sets.forEach((set: any) => {
          if (set.exercises?.muscle_groups) {
            set.exercises.muscle_groups.forEach((muscle: string) => {
              muscleCount.set(muscle, (muscleCount.get(muscle) || 0) + 1);
              totalSessions++;
            });
          }
        });
      }
    });

    // Convert to percentage breakdown
    return Array.from(muscleCount.entries())
      .map(([muscle, count]) => ({
        muscle_group: muscle,
        sessions: count,
        percentage: Math.round((count / totalSessions) * 100),
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 6); // Top 6 muscle groups
  };

  // Helper function to format week labels
  const formatWeekLabel = (weekStart: string): string => {
    const date = new Date(weekStart);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  // Navigation handlers
  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          {/* Profile Picture */}
          <View style={styles.profilePictureContainer}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.profilePicture} />
            ) : (
              <View style={[styles.profilePicture, styles.placeholderProfilePicture]}>
                <Ionicons name="person" size={32} color="#17D4D4" />
              </View>
            )}
          </View>

          {/* Username */}
          <Text style={styles.username}>{profile?.full_name || 'User'}</Text>

          {/* Settings Icon */}
          <TouchableOpacity style={styles.settingsButton} onPress={handleSettings}>
            <Ionicons name="settings-outline" size={26} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* Calendar Section */}
        <View style={styles.calendarSection}>
          <CalendarComponent
            currentMonth={currentMonth}
            workoutSessions={workoutSessions}
            onMonthChange={setCurrentMonth}
            navigation={navigation}
          />
        </View>

        {/* Analytics Section */}
        <View style={styles.analyticsSection}>
          <AnalyticsSection
            weeklyAnalytics={weeklyAnalytics}
            muscleAnalytics={muscleAnalytics}
          />
        </View>

        {/* Bottom spacing for tab bar */}
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
  scrollContainer: {
    flex: 1,
  },
  
  // Loading state
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
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  profilePictureContainer: {
    marginRight: 12,
  },
  profilePicture: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  placeholderProfilePicture: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    marginLeft: 0,
  },
  settingsButton: {
    padding: 4,
  },
  
  // Calendar Section
  calendarSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  
  // Calendar Component Styles
  calendar: {
    padding: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthNavButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#000000',
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#6E6E6E',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dateContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutDate: {
    backgroundColor: '#17D4D4',
  },
  todayDate: {
    borderWidth: 2,
    borderColor: '#17D4D4',
  },
  dateText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
  },
  otherMonthDate: {
    color: '#CCCCCC',
  },
  workoutDateText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
  },
  todayDateText: {
    color: '#17D4D4',
    fontFamily: 'Poppins-SemiBold',
  },
  legend: {
    marginTop: 16,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#6E6E6E',
  },
  
  // Analytics Section
  analyticsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  
  // Analytics Component Styles
  analyticsContainer: {
    padding: 20,
  },
  chartContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  
  // Simple Bar Chart Styles
  simpleBarChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: 10,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  barColumn: {
    width: '100%',
    height: 80,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 20,
    borderRadius: 2,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-Regular',
    color: '#6E6E6E',
    marginTop: 4,
  },
  barValue: {
    fontSize: 9,
    fontFamily: 'Poppins-Medium',
    color: '#17D4D4',
    marginTop: 2,
  },
  
  // Simple Line Chart Styles
  simpleLineChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    paddingHorizontal: 10,
    position: 'relative',
  },
  linePoint: {
    flex: 1,
    alignItems: 'center',
    height: 80,
    position: 'relative',
  },
  lineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
  },
  lineLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-Regular',
    color: '#6E6E6E',
    position: 'absolute',
    bottom: -15,
  },
  lineValue: {
    fontSize: 9,
    fontFamily: 'Poppins-Medium',
    color: '#0D9488',
    position: 'absolute',
    bottom: -28,
  },
  
  // Muscle Breakdown Styles
  muscleBreakdown: {
    width: '100%',
  },
  muscleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  muscleName: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#000000',
    width: 80,
  },
  muscleProgressContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginHorizontal: 12,
  },
  muscleProgress: {
    height: '100%',
    borderRadius: 4,
  },
  musclePercentage: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#6E6E6E',
    width: 35,
    textAlign: 'right',
  },
  
  emptyAnalyticsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyAnalyticsTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyAnalyticsText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#6E6E6E',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Common styles
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    marginBottom: 16,
  },
  
  bottomSpacing: {
    height: 100, // Space for tab bar
  },
});

export default ProfileScreen;