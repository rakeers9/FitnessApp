// src/screens/auth/PrivacyScreen.tsx - Placeholder

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const PrivacyScreen = () => {
  const navigation = useNavigation();

  const handleBackPress = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#17D4D4', '#FFFFFF']}
        locations={[0, 0.8]}
        style={styles.gradient}
      >
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.subtitle}>Effective Date: January 2025</Text>
          
          <Text style={styles.text}>
            Your privacy is important to us. This policy explains how WorkoutTracker collects, uses, and protects your information.
            {'\n\n'}
            <Text style={styles.boldText}>Information We Collect:</Text>
            {'\n'}
            • Account information (email, username)
            • Workout data and progress
            • Usage analytics to improve our service
            {'\n\n'}
            <Text style={styles.boldText}>How We Use Your Data:</Text>
            {'\n'}
            • To provide and improve our fitness tracking service
            • To sync your workouts across devices
            • To send important account notifications
            {'\n\n'}
            <Text style={styles.boldText}>Data Security:</Text>
            {'\n'}
            We use industry-standard encryption and security measures to protect your data.
            {'\n\n'}
            This is a placeholder privacy policy. Full policy will be added before production release.
          </Text>
        </ScrollView>
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
  content: {
    paddingHorizontal: 24,
    paddingTop: 120,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 32,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 24,
    textAlign: 'left',
  },
  boldText: {
    fontWeight: 'bold',
  },
});

export default PrivacyScreen;