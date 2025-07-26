// App.tsx

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { supabase } from './src/services/supabase';
import { Session } from '@supabase/supabase-js';

// Font loading
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_700Bold } from '@expo-google-fonts/poppins';

// Import screens
import SplashScreen from './src/screens/onboarding/SplashScreen';
import GetStartedScreen from './src/screens/onboarding/GetStartedScreen';
import AuthStack from './src/screens/auth/AuthStack';
import PostAuthSetupScreen from './src/screens/onboarding/PostAuthSetupScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';

const Stack = createStackNavigator();

export default function App() {
  // All hooks must be called before any conditional returns
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_700Bold,
  });

  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [hasCompletedSetup, setHasCompletedSetup] = useState(false);

  // Check if user has completed setup
  const checkSetupStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('has_completed_setup')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error checking setup status:', error);
        return false;
      }

      return data?.has_completed_setup || false;
    } catch (error) {
      console.error('Error in checkSetupStatus:', error);
      return false;
    }
  };

  useEffect(() => {
    // Show splash screen for 2 seconds while checking auth
    setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      // If user is logged in, check their setup status
      if (session?.user) {
        const setupComplete = await checkSetupStatus(session.user.id);
        setHasCompletedSetup(setupComplete);
      }

      setIsLoading(false);
      setShowSplash(false);
    }, 2000);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

      // Check setup status when user logs in
      if (session?.user) {
        const setupComplete = await checkSetupStatus(session.user.id);
        setHasCompletedSetup(setupComplete);
      } else {
        setHasCompletedSetup(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Now we can safely use conditional returns after all hooks are called
  // Show splash screen if fonts aren't loaded OR if we're still loading
  if (!fontsLoaded || showSplash || isLoading) {
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
          <Stack.Screen 
            name="PostAuthSetup" 
            component={PostAuthSetupScreen}
            initialParams={{ 
              onSetupComplete: () => setHasCompletedSetup(true) 
            }}
          />
        ) : (
          // Ready for main app
          <Stack.Screen name="Main" component={MainTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}