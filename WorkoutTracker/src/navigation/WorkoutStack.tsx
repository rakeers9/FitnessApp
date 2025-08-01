// src/navigation/WorkoutStack.tsx

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MainTabNavigator from './MainTabNavigator';

// Import all workout-related screens
import EditWorkoutScreen from '../screens/main/EditWorkoutScreen';
import ExerciseLibraryScreen from '../screens/main/ExerciseLibraryScreen';
import ReorderExercisesScreen from '../screens/main/ReorderExercisesScreen';
import ExerciseCommentsScreen from '../screens/main/ExerciseCommentsScreen'; // Placeholder implementation
import WorkoutLogsScreen from '../screens/main/WorkoutLogsScreen';
import LogWorkoutScreen from '../screens/main/LogWorkoutScreen';
import ViewWorkoutSessionScreen from '../screens/main/ViewWorkoutSessionScreen';

const Stack = createStackNavigator();

const WorkoutStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: '#FFFFFF' },
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      {/* Main app with tab navigation */}
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabNavigator}
      />
      
      {/* Workout creation and editing */}
      <Stack.Screen 
        name="EditWorkout" 
        component={EditWorkoutScreen}
      />
      
      {/* Exercise library for adding exercises */}
      <Stack.Screen 
        name="ExerciseLibrary" 
        component={ExerciseLibraryScreen}
      />
      
      {/* Reorder exercises */}
      <Stack.Screen 
        name="ReorderExercises" 
        component={ReorderExercisesScreen}
      />
      
      {/* Exercise comments (placeholder) */}
      <Stack.Screen 
        name="ExerciseComments" 
        component={ExerciseCommentsScreen}
      />
      
      {/* Workout logs (from profile calendar) */}
      <Stack.Screen 
        name="WorkoutLogs" 
        component={WorkoutLogsScreen}
      />
      
      {/* Log workout (for past dates) */}
      <Stack.Screen 
        name="LogWorkout" 
        component={LogWorkoutScreen}
      />
      
      {/* View completed workout session */}
      <Stack.Screen 
        name="ViewWorkoutSession" 
        component={ViewWorkoutSessionScreen}
      />
    </Stack.Navigator>
  );
};

export default WorkoutStack;