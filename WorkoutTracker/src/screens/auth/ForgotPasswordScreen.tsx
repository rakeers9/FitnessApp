// src/screens/auth/ForgotPasswordScreen.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
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
        locations={[0, 1]}
        style={styles.gradient}
      >
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
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
              <Image 
                source={require('../../../assets/fl-logo-white.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <View style={styles.textSection}>
              <Text style={styles.titleText}>Get Your Account Back</Text>
              <Text style={styles.subtitleText}>
                Enter your email and we will send you instructions on how to reset your password
              </Text>
            </View>

            {/* Input Field */}
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
          </View>

          {/* Spacer to push bottom section down */}
          <View style={styles.spacer} />
        </ScrollView>

        {/* Fixed Bottom Section */}
        <View style={styles.bottomSection}>
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
        </View>
      </LinearGradient>

      {/* Password Reset Popup Modal */}
      {showResetPopup && (
        <PasswordResetPopup onReturnToLogin={handleReturnToLogin} />
      )}
    </View>
  );
};

// Password Reset Popup Component
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
  logo: {
    width: 160,
    height: 120,
  },
  textSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputContainer: {
    backgroundColor: 'rgba(196, 196, 196, 0.2)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
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
  resetButton: {
    backgroundColor: '#17D4D4',
    borderRadius: 26,
    width: width * 0.85,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Popup Styles
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
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  popupText: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
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
    fontWeight: 'bold',
  },
});

export default ForgotPasswordScreen;