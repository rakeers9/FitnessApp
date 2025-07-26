// src/screens/onboarding/PostAuthSetup.tsx

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import PreferencesScreen from './PreferencesScreen';
import CoachConnectionScreen from './CoachConnectionScreen';

// Define the navigation types for this stack
export type PostAuthSetupStackParamList = {
  Preferences: { onSetupComplete?: () => void };
  CoachConnection: { onSetupComplete?: () => void };
};

// Define props for the main PostAuthSetup screen
interface PostAuthSetupScreenProps {
  route: RouteProp<any, 'PostAuthSetup'> & {
    params?: { onSetupComplete?: () => void };
  };
}

const Stack = createStackNavigator<PostAuthSetupStackParamList>();

const PostAuthSetupScreen: React.FC<PostAuthSetupScreenProps> = ({ route }) => {
  // Get the callback from the route params (passed from App.tsx)
  const { onSetupComplete } = route.params || {};

  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        gestureEnabled: true, // Allow swipe back
      }}
      initialRouteName="Preferences"
    >
      <Stack.Screen 
        name="Preferences" 
        component={PreferencesScreen}
        initialParams={{ onSetupComplete }}
      />
      <Stack.Screen 
        name="CoachConnection" 
        component={CoachConnectionScreen}
      />
    </Stack.Navigator>
  );
};

export default PostAuthSetupScreen;