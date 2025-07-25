// App.tsx - Updated navigation structure

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { supabase } from './src/services/supabase';
import { Session } from '@supabase/supabase-js';

// Import screens (we'll create these step by step)
import SplashScreen from './src/screens/onboarding/SplashScreen';
import GetStartedScreen from './src/screens/onboarding/GetStartedScreen';
import AuthStack from './src/screens/auth/AuthStack';
import PostAuthSetup from './src/screens/onboarding/PostAuthSetup';
import MainTabNavigator from './src/navigation/MainTabNavigator';

const Stack = createStackNavigator();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [hasCompletedSetup, setHasCompletedSetup] = useState(false);

  useEffect(() => {
    // Show splash screen for 2 seconds while checking auth
    setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setIsLoading(false);
        setShowSplash(false);
      });
    }, 2000);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show splash screen first
  if (showSplash || isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          // Not logged in flow
          <>
            <Stack.Screen name="GetStarted" component={GetStartedScreen} />
            <Stack.Screen name="Auth" component={AuthStack} />
          </>
        ) : !hasCompletedSetup ? (
          // Logged in but needs to complete setup
          <Stack.Screen name="PostAuthSetup" component={PostAuthSetup} />
        ) : (
          // Ready for main app
          <Stack.Screen name="Main" component={MainTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}