// src/screens/onboarding/PreferencesScreen.tsx
// src/screens/onboarding/PreferencesScreen.tsx

import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { supabase } from '../../services/supabase';

// Type definitions
type PostAuthSetupStackParamList = {
  Preferences: { onSetupComplete?: () => void };
  CoachConnection: { onSetupComplete?: () => void };
};

type PreferencesScreenNavigationProp = StackNavigationProp<
  PostAuthSetupStackParamList,
  'Preferences'
>;

type PreferencesScreenRouteProp = RouteProp<
  PostAuthSetupStackParamList,
  'Preferences'
>;

interface Props {
  navigation: PreferencesScreenNavigationProp;
  route: PreferencesScreenRouteProp;
}

const { width, height } = Dimensions.get('window');

const PreferencesScreen: React.FC<Props> = ({ navigation, route }) => {
  const { onSetupComplete } = route.params || {};
  
  const [selectedUnit, setSelectedUnit] = useState<'kg' | 'lb'>('kg');
  const [isLoading, setIsLoading] = useState(false);

  const handleUnitToggle = (unit: 'kg' | 'lb') => {
    setSelectedUnit(unit);
  };

  const handleAllowNotifications = async () => {
    setIsLoading(true);

    try {
      const { status } = await Notifications.requestPermissionsAsync();
      const notificationsEnabled = status === 'granted';

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('profiles')
        .update({
          unit_preference: selectedUnit,
          notifications_enabled: notificationsEnabled,
        })
        .eq('id', user.id);

      if (error) throw error;

      navigation.navigate('CoachConnection', { onSetupComplete });

    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert(
        'Error',
        'Failed to save preferences. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#17D4D4', '#FFFFFF']}
        locations={[0, 1]}
        style={styles.gradient}
      >
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Scrollable Content Area */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo and Text Section */}
          <View style={styles.topSection}>
            <View style={styles.logoSection}>
              {/* Empty space for logo consistency */}
            </View>

            <View style={styles.textSection}>
              <Text style={styles.titleText}>Set Up Your Preferences</Text>
              <Text style={styles.subtitleText}>
                Pick your unit (kg or lb) and turn on notifications — we'll keep you 
                focused and consistent
              </Text>
            </View>

            {/* Unit Selector Section */}
            <View style={styles.inputSection}>
              <View style={styles.unitSelectorRow}>
                <Text style={styles.fieldLabel}>Set your unit preference</Text>
                
                {/* Unit Selector Toggle */}
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.toggleOption,
                      selectedUnit === 'kg' && styles.toggleOptionSelected,
                    ]}
                    onPress={() => handleUnitToggle('kg')}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        selectedUnit === 'kg' && styles.toggleTextSelected,
                      ]}
                    >
                      kg
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.toggleOption,
                      selectedUnit === 'lb' && styles.toggleOptionSelected,
                    ]}
                    onPress={() => handleUnitToggle('lb')}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        selectedUnit === 'lb' && styles.toggleTextSelected,
                      ]}
                    >
                      lb
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Spacer to push bottom section down */}
          <View style={styles.spacer} />
        </ScrollView>

        {/* Fixed Bottom Section */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleAllowNotifications}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Setting up...' : 'Allow Notifications'}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 24,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    minHeight: height * 0.7,
  },
  topSection: {
    justifyContent: 'flex-start',
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 96,
    marginBottom: 24,
  },
  textSection: {
    marginBottom: 32,
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text as specified
    marginBottom: 12,
    textAlign: 'left', // Left-aligned as specified
  },
  subtitleText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)', // White with opacity
    fontWeight: '500',
    textAlign: 'left', // Left-aligned as specified
    lineHeight: 20,
    // Removed paddingHorizontal to match design
  },
  inputSection: {
    marginBottom: 20,
  },
  unitSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    // Removed marginHorizontal for proper alignment
  },
  fieldLabel: {
    fontSize: 16, // Increased from 14 as specified
    color: '#FFFFFF', // Changed to white to match design
    fontWeight: '500',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(196, 196, 196, 0.2)',
    borderRadius: 20,
    padding: 4,
    width: 140,
    height: 40,
  },
  toggleOption: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  toggleOptionSelected: {
    backgroundColor: '#FFFFFF',
  },
  toggleText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '400',
  },
  toggleTextSelected: {
    fontWeight: 'bold', // Bold when selected
    color: '#000000',
  },
  spacer: {
    flex: 1,
    minHeight: 20,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 48 : 24,
    backgroundColor: 'transparent',
  },
  button: {
    backgroundColor: '#17D4D4',
    borderRadius: 26,
    width: width * 0.85,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default PreferencesScreen;