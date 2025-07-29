// src/navigation/WorkoutStack.tsx

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MainTabNavigator from './MainTabNavigator';
import EditWorkoutScreen from '../screens/main/EditWorkoutScreen';
import ExerciseLibraryScreen from '../screens/main/ExerciseLibraryScreen';
import LiveWorkoutSessionScreen from '../screens/main/LiveWorkoutSessionScreen';


const Stack = createStackNavigator();

const WorkoutStack = () => {
  return (
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
        name="LiveWorkoutSession" 
        component={LiveWorkoutSessionScreen}
        options={{
            presentation: 'card',
        }}
       />
    </Stack.Navigator>
  );
};

export default WorkoutStack;