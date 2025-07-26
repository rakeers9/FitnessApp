// src/screens/auth/LoginScreen.tsx

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

const LoginScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
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
    }
    
    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        // Handle specific login errors
        if (error.message.includes('Email not confirmed')) {
          Alert.alert(
            'Email Not Confirmed',
            'Please check your email and click the confirmation link before logging in.',
            [{ text: 'OK' }]
          );
        } else if (error.message.includes('Invalid login credentials')) {
          Alert.alert(
            'Login Failed',
            'Incorrect email or password. Please try again.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Login Failed', error.message);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const navigateToRegister = () => {
    navigation.navigate('Register' as never);
  };

  const navigateToForgotPassword = () => {
    navigation.navigate('ForgotPassword' as never);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#17D4D4', '#FFFFFF']}
        locations={[0, 1]}
        style={styles.gradient}
      >
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
              <Text style={styles.welcomeText}>Welcome back</Text>
              <Text style={styles.subtitleText}>Sign in to access your account</Text>
            </View>

            {/* Input Fields */}
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

              <TouchableOpacity onPress={navigateToForgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Spacer to push bottom section down */}
          <View style={styles.spacer} />
        </ScrollView>

        {/* Fixed Bottom Section */}
        <View style={styles.bottomSection}>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={navigateToRegister}>
            <Text style={styles.registerText}>
              New Member? <Text style={styles.registerLink}>Register now</Text>
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
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255, 255, 255, 0.8)',
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
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#000000',
  },
  inputIcon: {
    color: 'rgba(0, 0, 0, 0.4)',
    marginLeft: 8,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '300',
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(0, 0, 0, 0.5)',
    textAlign: 'center',
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
  loginButton: {
    backgroundColor: '#17D4D4',
    borderRadius: 26,
    width: width * 0.85,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  registerText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(0, 0, 0, 0.5)',
  },
  registerLink: {
    fontWeight: '500',
    fontFamily: 'Poppins_500Medium',
    color: '#17D4D4',
  },
});

export default LoginScreen;