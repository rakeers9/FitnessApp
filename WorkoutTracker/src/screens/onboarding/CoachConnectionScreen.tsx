// src/screens/onboarding/CoachConnectionScreen.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { supabase } from '../../services/supabase';

const { width, height } = Dimensions.get('window');

type PostAuthSetupStackParamList = {
  Preferences: undefined;
  CoachConnection: { onSetupComplete?: () => void };
};

type CoachConnectionScreenNavigationProp = StackNavigationProp<
  PostAuthSetupStackParamList,
  'CoachConnection'
>;

type CoachConnectionScreenRouteProp = RouteProp<
  PostAuthSetupStackParamList,
  'CoachConnection'
>;

interface Props {
  navigation: CoachConnectionScreenNavigationProp;
  route: CoachConnectionScreenRouteProp;
}

const CoachConnectionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { onSetupComplete } = route.params || {};

  const [coachEmail, setCoachEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConnectWithCoach = async () => {
    if (!coachEmail.trim()) {
      Alert.alert('Error', 'Please enter your coach\'s email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(coachEmail.trim())) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: coachProfile, error: coachError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', coachEmail.trim().toLowerCase())
        .single();

      if (coachError || !coachProfile) {
        Alert.alert(
          'Coach Not Found',
          'We couldn\'t find a coach with this email. Make sure they\'ve signed up as a coach first, or skip for now.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          coach_id: coachProfile.id,
          has_completed_setup: true,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      Alert.alert(
        'Connected!',
        `You're now connected with ${coachProfile.full_name || 'your coach'}. They can now create workouts for you!`,
        [
          {
            text: 'Let\'s Go!',
            onPress: () => {
              onSetupComplete?.();
            },
          },
        ]
      );

    } catch (error) {
      console.error('Error connecting with coach:', error);
      Alert.alert(
        'Connection Failed',
        'Failed to connect with coach. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('profiles')
        .update({
          has_completed_setup: true,
        })
        .eq('id', user.id);

      if (error) throw error;

      onSetupComplete?.();

    } catch (error) {
      console.error('Error completing setup:', error);
      Alert.alert(
        'Error',
        'Failed to complete setup. Please try again.',
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
        locations={[0, 0.8]}
        style={styles.gradient}
      >
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

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
              <Text style={styles.titleText}>Connect with your Coach</Text>
              <Text style={styles.subtitleText}>
                Connect with your coach to receive personalized workouts and feedback, 
                or skip for now and link up later anytime.
              </Text>
            </View>

            {/* Coach Email Input */}
            <View style={styles.inputSection}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Coach's Email"
                  placeholderTextColor="rgba(0, 0, 0, 0.4)"
                  value={coachEmail}
                  onChangeText={setCoachEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <Ionicons 
                  name="mail-outline" 
                  size={20} 
                  style={styles.inputIcon}
                />
              </View>
            </View>
          </View>

          {/* Spacer to push buttons to bottom */}
          <View style={styles.spacer} />
        </ScrollView>

        {/* Fixed Bottom Section */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleConnectWithCoach}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Connecting...' : 'Connect with Coach'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip} disabled={isLoading}>
            <Text style={styles.skipText}>
              No Coach Yet? <Text style={styles.skipLink}>Skip</Text>
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
    marginBottom: 40,
    marginLeft: 14, // Align with back button
    marginRight: 14,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '700', // Bold weight
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'left', // Left-aligned instead of center
    fontFamily: 'Poppins-ExtraBold', // Custom font
  },
  subtitleText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)', // Adjusted opacity
    fontWeight: '400',
    textAlign: 'left', // Left-aligned instead of center
    lineHeight: 20,
    maxWidth: 300, // Limit width for readability
    fontFamily: 'Poppins-Light', // Custom font
  },
  inputSection: {
    marginBottom: 20,
    marginLeft: 10,
    marginRight: 10,
  },
  inputContainer: {
    backgroundColor: 'rgba(196, 196, 196, 0.2)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 24,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    fontFamily: 'Poppins-Regular',
  },
  inputIcon: {
    color: 'rgba(0, 0, 0, 0.4)',
    marginLeft: 8,
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
    borderRadius: 26, // Pill-shaped
    width: width * 0.85, // 85% of screen width
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center', // Center horizontally
    // Soft drop shadow for floating effect
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 420, // Space above button
    marginBottom: 15, // Space below button
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600', // Semi-bold
    fontFamily: 'Poppins-Bold',
  },
  skipText: {
    fontSize: 16,
    color: 'rgba(0, 0, 0, 0.5)',
  },
  skipLink: {
    color: '#17D4D4',
    fontWeight: '500',
  },
});

export default CoachConnectionScreen;