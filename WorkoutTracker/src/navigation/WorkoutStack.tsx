// src/navigation/WorkoutStack.tsx

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MainTabNavigator from './MainTabNavigator';
import EditWorkoutScreen from '../screens/main/EditWorkoutScreen';
import ExerciseLibraryScreen from '../screens/main/ExerciseLibraryScreen';
import ReorderExercisesScreen from '../screens/main/ReorderExercisesScreen';
import ExerciseCommentsScreen from '../screens/main/ExerciseCommentsScreen';
import { WorkoutSessionProvider } from '../context/WorkoutSessionContext';

// Define the param list type
export type WorkoutStackParamList = {
  MainTabs: undefined;
  EditWorkout: { workout?: any };
  ExerciseLibrary: { onExercisesSelected: (exercises: any[]) => void };
  ReorderExercises: { workout: any; onReorder: (exercises: any[]) => void };
  ExerciseComments: { exerciseId: string; exerciseName: string };
};

const Stack = createStackNavigator<WorkoutStackParamList>();

const WorkoutStack = () => {
  return (
    <WorkoutSessionProvider>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#FFFFFF' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen 
          name="EditWorkout" 
          component={EditWorkoutScreen}
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen 
          name="ExerciseLibrary" 
          component={ExerciseLibraryScreen}
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen 
          name="ReorderExercises" 
          component={ReorderExercisesScreen}
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen 
          name="ExerciseComments" 
          component={ExerciseCommentsScreen}
          options={{
            presentation: 'modal',
            cardStyle: { backgroundColor: 'transparent' },
          }}
        />
      </Stack.Navigator>
    </WorkoutSessionProvider>
  );
};

export default WorkoutStack;