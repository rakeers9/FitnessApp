// src/screens/auth/TermsScreen.tsx - Placeholder

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

const TermsScreen = () => {
  const navigation = useNavigation();

  const handleBackPress = () => {
    navigation.goBack();
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

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Terms of Use</Text>
          <Text style={styles.subtitle}>Effective Date: January 2025</Text>
          
          <Text style={styles.text}>
            Welcome to WorkoutTracker! These terms govern your use of our fitness tracking application.
            {'\n\n'}
            By using WorkoutTracker, you agree to these terms and our Privacy Policy.
            {'\n\n'}
            • You must be 13 years or older to use this app
            • You are responsible for keeping your account secure
            • We reserve the right to terminate accounts that violate our terms
            • Content you create belongs to you, but you grant us license to use it
            {'\n\n'}
            This is a placeholder terms page. Full terms will be added before production release.
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
});

export default TermsScreen;