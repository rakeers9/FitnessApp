// src/screens/auth/ForgotPasswordScreen.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';

const { width, height } = Dimensions.get('window');

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetPopup, setShowResetPopup] = useState(false);

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Email is required');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email');
      return false;
    }
    
    return true;
  };

  const handlePasswordReset = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        // Show success popup instead of alert
        setShowResetPopup(true);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleReturnToLogin = () => {
    setShowResetPopup(false);
    navigation.navigate('Login' as never);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#17D4D4', '#FFFFFF']}
        locations={[0, 0.8]}
        style={styles.gradient}
      >
        {/* Back Button - Now solid white background */}
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </TouchableOpacity>

        {/* Scrollable Content Area */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Text Section - Now left-aligned and closer to back button */}
          <View style={styles.textSection}>
            <Text style={styles.titleText}>Get Your Account Back</Text>
            <Text style={styles.subtitleText}>
              Enter your email and we will send you instructions on how to reset your password
            </Text>
          </View>

          {/* Input Field - Icon moved to right side */}
          <View style={styles.inputSection}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Ionicons name="mail-outline" size={20} style={styles.inputIcon} />
            </View>
          </View>

          {/* Spacer to maintain proper button positioning */}
          <View style={styles.spacer} />

          {/* Reset Button - Positioned with proper spacing */}
          <TouchableOpacity 
            style={styles.resetButton}
            onPress={handlePasswordReset}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.resetButtonText}>Send Password Reset</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>

      {/* Password Reset Popup Modal */}
      {showResetPopup && (
        <PasswordResetPopup onReturnToLogin={handleReturnToLogin} />
      )}
    </View>
  );
};

// Password Reset Popup Component - Updated with Poppins font
const PasswordResetPopup = ({ onReturnToLogin }: { onReturnToLogin: () => void }) => {
  return (
    <View style={styles.popupOverlay}>
      <View style={styles.popupContainer}>
        <Text style={styles.popupTitle}>Password Reset</Text>
        <Text style={styles.popupText}>
          If the email you entered is found, we will send you instructions to reset your password
        </Text>
        <TouchableOpacity 
          style={styles.popupButton}
          onPress={onReturnToLogin}
        >
          <Text style={styles.popupButtonText}>Return to Login</Text>
        </TouchableOpacity>
      </View>
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
  // Updated back button - solid white background with subtle shadow
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 24,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF', // Solid white instead of semi-transparent
    justifyContent: 'center',
    alignItems: 'center',
    // Subtle shadow for separation
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32, // Space below back button
    minHeight: height * 0.8,
  },
  // Updated text section - left-aligned and positioned closer to back button
  textSection: {
    marginTop: 110, // ~32px below back button (considering back button top position)
    marginBottom: 24,
    marginLeft: 14, // Align with back button
  },
  // Updated title - left-aligned with Poppins font
  titleText: {
    fontSize: 28,
    fontWeight: '700', // Bold weight
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'left', // Left-aligned instead of center
    fontFamily: 'Poppins-ExtraBold', // Custom font
  },
  // Updated subtitle - left-aligned with proper opacity and max width
  subtitleText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)', // Adjusted opacity
    fontWeight: '400',
    textAlign: 'left', // Left-aligned instead of center
    lineHeight: 20,
    maxWidth: 300, // Limit width for readability
    fontFamily: 'Poppins-Light', // Custom font
  },
  // Input section positioned with proper spacing
  inputSection: {
    marginTop: 24, // 24px after subtitle
    marginLeft: 10, // Align with text section
    marginRight: 10,
  },
  // Updated input container - different background opacity
  inputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)', // Updated opacity
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14, // Proper vertical padding
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    fontFamily: 'Poppins_400Regular',
  },
  // Input icon moved to right side
  inputIcon: {
    color: 'rgba(0, 0, 0, 0.4)',
    marginLeft: 8,
  },
  spacer: {
    height: 64, // Proper spacing before button
  },
  // Updated reset button - proper dimensions and positioning
  resetButton: {
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
  },
  // Updated button text with Poppins font
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600', // Semi-bold
    fontFamily: 'Poppins-Bold',
  },
  // Updated popup styles with Poppins font
  popupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  popupContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', // Poppins when available
  },
  popupText: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', // Poppins when available
  },
  popupButton: {
    backgroundColor: '#17D4D4',
    borderRadius: 26,
    paddingHorizontal: 32,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 160,
  },
  popupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', // Poppins when available
  },
});

export default ForgotPasswordScreen;