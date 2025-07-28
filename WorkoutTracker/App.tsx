// App.tsx

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { supabase } from './src/services/supabase';
import { Session } from '@supabase/supabase-js';

// Font loading - combining Google Fonts with custom font
import { useFonts } from 'expo-font';
import { 
  Poppins_400Regular, 
  Poppins_500Medium, 
  Poppins_600SemiBold,
  Poppins_700Bold 
} from '@expo-google-fonts/poppins';

// Import screens
import SplashScreen from './src/screens/onboarding/SplashScreen';
import GetStartedScreen from './src/screens/onboarding/GetStartedScreen';
import AuthStack from './src/screens/auth/AuthStack';
import PostAuthSetupScreen from './src/screens/onboarding/PostAuthSetupScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';

const Stack = createStackNavigator();

export default function App() {
  // Load both Google Fonts and custom fonts
  const [fontsLoaded] = useFonts({
    // Google Fonts from @expo-google-fonts/poppins
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
    
    // Custom font from your assets folder
    'Poppins-ExtraBold': require('./assets/fonts/Poppins-ExtraBold.ttf'),
    'Poppins-Light': require('./assets/fonts/Poppins-Light.ttf'),
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
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (session?.user) {
          // Check setup status BEFORE setting session to avoid flash
          const setupComplete = await checkSetupStatus(session.user.id);
          if (mounted) {
            setHasCompletedSetup(setupComplete);
            setSession(session);
          }
        } else {
          if (mounted) {
            setSession(session);
            setHasCompletedSetup(false);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
          setTimeout(() => {
            if (mounted) setShowSplash(false);
          }, 2000);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (session?.user) {
        // For login events, check setup status first to prevent flash
        if (event === 'SIGNED_IN') {
          const setupComplete = await checkSetupStatus(session.user.id);
          if (mounted) {
            setHasCompletedSetup(setupComplete);
            setSession(session);
          }
        } else {
          // For other events, update normally
          setSession(session);
          const setupComplete = await checkSetupStatus(session.user.id);
          if (mounted) {
            setHasCompletedSetup(setupComplete);
          }
        }
      } else {
        if (mounted) {
          setSession(session);
          setHasCompletedSetup(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Show splash screen if fonts aren't loaded OR if we're still loading
  if (!fontsLoaded || showSplash || isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          cardStyle: { backgroundColor: '#FFFFFF' }, // Solid background
          animation: 'none', // Disable all animations for instant transitions
          gestureEnabled: false,   // Disable gestures that can cause overlaps
        }}
      >
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