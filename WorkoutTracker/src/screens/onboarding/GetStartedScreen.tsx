// src/screens/onboarding/GetStartedScreen.tsx

import React from 'react';
import { 
  View, 
  StyleSheet, 
  Dimensions, 
  Image, 
  TouchableOpacity, 
  Text 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const GetStartedScreen = () => {
  const navigation = useNavigation();

  const handleGetStarted = () => {
    // Navigate to Auth stack when button is pressed
    navigation.navigate('Auth' as never);
  };

  return (
    <View style={styles.container}>
      {/* Logo Section - positioned in upper portion */}
      <View style={styles.logoSection}>
        <Image 
          source={require('../../../assets/fl-logo-colored.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Button Section - positioned at bottom */}
      <View style={styles.buttonSection}>
        <TouchableOpacity 
          style={styles.getStartedButton}
          onPress={handleGetStarted}
          activeOpacity={0.95} // Slight scale effect on press
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White background
    paddingHorizontal: 24, // Consistent padding
  },
  logoSection: {
    flex: 0.6, // Takes up 60% of screen for logo positioning
    justifyContent: 'center', // Centers logo in this section
    alignItems: 'center',
    paddingTop: height * 0.1, // Positions logo ~25-30% from top
  },
  logo: {
    width: 180, // Same dimensions as splash
    height: 150,
  },
  buttonSection: {
    flex: 0.4, // Takes up 40% of screen for button area
    justifyContent: 'flex-end', // Pushes button toward bottom
    alignItems: 'center',
    paddingBottom: 48, // Bottom spacing as specified
  },
  getStartedButton: {
    backgroundColor: '#17D4D4', // Blue background
    borderColor: '#000000', // Black border
    borderWidth: 1,
    borderRadius: 26, // Full pill shape (half of height)
    width: width * 0.8, // 80% of screen width (~312px on standard screen)
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    // Subtle drop shadow
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3, // Android shadow
  },
  buttonText: {
    color: '#FFFFFF', // White text
    fontSize: 16,
    fontWeight: '600', // Semi-bold for clarity
    letterSpacing: 0.5, // Slight letter spacing for readability
  },
});

export default GetStartedScreen;