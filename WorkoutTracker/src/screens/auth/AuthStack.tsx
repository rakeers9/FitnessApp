// src/screens/auth/AuthStack.tsx

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import ForgotPasswordScreen from './ForgotPasswordScreen';
import TermsScreen from './TermsScreen';
import PrivacyScreen from './PrivacyScreen';

const Stack = createStackNavigator();

const AuthStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false, // No headers for clean design
        cardStyle: { backgroundColor: '#FFFFFF' }, // Solid white background
        animation: 'none', // Disable all animations for instant transitions
        gestureEnabled: false,   // Disable swipe gestures that can cause overlaps
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="Terms" component={TermsScreen} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} />
    </Stack.Navigator>
  );
};

export default AuthStack;