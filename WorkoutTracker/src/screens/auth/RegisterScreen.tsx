// src/screens/auth/RegisterScreen.tsx

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

const RegisterScreen = () => {
  const navigation = useNavigation();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Username is required');
      return false;
    } else if (username.trim().length < 2) {
      Alert.alert('Error', 'Username must be at least 2 characters');
      return false;
    }
    
    if (!email.trim()) {
      Alert.alert('Error', 'Email is required');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email');
      return false;
    }
    
    if (!password) {
      Alert.alert('Error', 'Password is required');
      return false;
    } else if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }
    
    if (!acceptedTerms) {
      Alert.alert('Error', 'Please accept the terms and privacy policy');
      return false;
    }
    
    return true;
  };

  const checkIfEmailExists = async (email: string) => {
    try {
      // Check if email exists in profiles table (confirmed users)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (profileData) {
        return 'confirmed'; // User exists and is confirmed
      }

      // If not in profiles, they might be unconfirmed in auth.users
      // We'll attempt signup and handle the error if they exist
      return 'not_found';
    } catch (error) {
      return 'not_found';
    }
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // First check if email already exists
      const emailStatus = await checkIfEmailExists(email);
      
      if (emailStatus === 'confirmed') {
        Alert.alert(
          'Account Exists', 
          'An account with this email already exists. Please try logging in instead.',
          [
            { text: 'Cancel' },
            { text: 'Go to Login', onPress: () => navigation.navigate('Login' as never) }
          ]
        );
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: username.trim(),
          }
        }
      });

      if (error) {
        // Handle specific Supabase errors
        if (error.message.includes('already registered')) {
          Alert.alert(
            'Account Exists',
            'This email is already registered but may not be confirmed. Please check your email for a confirmation link, or try logging in.',
            [
              { text: 'OK' },
              { text: 'Go to Login', onPress: () => navigation.navigate('Login' as never) }
            ]
          );
        } else {
          Alert.alert('Sign Up Failed', error.message);
        }
      } else {
        // Success
        if (data.user && !data.user.email_confirmed_at) {
          Alert.alert(
            'Check Your Email!', 
            'We\'ve sent you a confirmation email. Please check your inbox and click the link to activate your account.',
            [{ text: 'OK', onPress: () => navigation.navigate('Login' as never) }]
          );
        } else {
          Alert.alert(
            'Success', 
            'Account created successfully!',
            [{ text: 'OK', onPress: () => navigation.navigate('Login' as never) }]
          );
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login' as never);
  };

  const navigateToTerms = () => {
    navigation.navigate('Terms' as never);
  };

  const navigateToPrivacy = () => {
    navigation.navigate('Privacy' as never);
  };

  return (
    <View style={styles.container}>
      {/* <LinearGradient
        colors={['#17D4D4', '#FFFFFF']}
        locations={[0, 0.8]}
        style={styles.gradient}
      > */}
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
                source={require('../../../assets/fl-logo-colored.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <View style={styles.textSection}>
              <Text style={styles.welcomeText}>Get Started</Text>
              <Text style={styles.subtitleText}>Create a free account</Text>
            </View>

            {/* Input Fields */}
            <View style={styles.inputSection}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="rgba(0, 0, 0, 0.4)"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Ionicons name="person-outline" size={20} style={styles.inputIcon} />
              </View>

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

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="rgba(0, 0, 0, 0.4)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                <Ionicons name="lock-closed-outline" size={20} style={styles.inputIcon} />
              </View>

              {/* Terms Checkbox */}
              <View style={styles.checkboxSection}>
                <TouchableOpacity 
                  style={styles.checkboxContainer}
                  onPress={() => setAcceptedTerms(!acceptedTerms)}
                >
                  <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                    {acceptedTerms && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </View>
                  <View style={styles.checkboxTextContainer}>
                    <Text style={styles.checkboxText}>
                      By continuing you accept our{' '}
                      <Text style={styles.linkText} onPress={navigateToPrivacy}>
                        Privacy Policy
                      </Text>
                      {' '}and{' '}
                      <Text style={styles.linkText} onPress={navigateToTerms}>
                        Terms of Use
                      </Text>
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Spacer to push bottom section down */}
          <View style={styles.spacer} />
        </ScrollView>

        {/* Fixed Bottom Section */}
        <View style={styles.bottomSection}>
          <TouchableOpacity 
            style={styles.signUpButton}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.signUpButtonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={navigateToLogin}>
            <Text style={styles.loginText}>
              Already a Member? <Text style={styles.loginLink}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      {/* </LinearGradient> */}
    </View>
  );
};

// Styles remain exactly the same, just remove errorText style since we're not using it
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // gradient: {
  //   flex: 1,
  //   borderTopLeftRadius: 40,
  //   borderTopRightRadius: 40,
  // },
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
    marginTop: 124,
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
  welcomeText: {
    fontSize: 30,
    fontWeight: 'bold',
    fontFamily: 'Poppins-ExtraBold',
    color: '#000000',
    marginBottom: 2,
  },
  subtitleText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Poppins-Light',
    color: 'rgba(0, 0, 0, 0.8)',
    marginBottom: 32,
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
    marginBottom: 24,
    height: 48,
    marginLeft: 10,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    fontFamily: 'Poppins-Regular',
  },
  inputIcon: {
    color: 'rgba(0, 0, 0, 0.4)',
    marginLeft: 8,
  },
  checkboxSection: {
    marginTop: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.3)',
    backgroundColor: 'transparent',
    // marginRight: 12,
    marginTop: -10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 14,
  },
  checkboxChecked: {
    backgroundColor: '#17D4D4',
    borderColor: '#17D4D4',
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxText: {
    fontSize: 13,
    color: 'rgba(0, 0, 0, 0.5)',
    lineHeight: 18,
    fontFamily: 'Poppins-Regular',
    marginRight: 4,
    marginLeft: 8,
    marginTop: -10,
  },
  linkText: {
    color: '#17D4D4',
    textDecorationLine: 'underline',
    fontFamily: 'Poppins-Regular',
    marginRight: 4,
    marginLeft: 4,
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
  signUpButton: {
    backgroundColor: '#17D4D4',
    borderRadius: 26,
    width: width * 0.85,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  signUpButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  loginText: {
    fontSize: 15,
    color: 'rgba(0, 0, 0, 0.5)',
    fontFamily: 'Poppins-Medium',
  },
  loginLink: {
    color: '#17D4D4',
    fontWeight: '500',
    fontFamily: 'Poppins-Medium',
  },
});

export default RegisterScreen;