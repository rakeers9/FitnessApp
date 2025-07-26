// src/screens/onboarding/SplashScreen.tsx

import React from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';

const { width, height } = Dimensions.get('window');

const SplashScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        {/* Replace 'fl-logo-white' with your actual logo file */}
        <Image 
          source={require('../../../assets/fl-logo-white.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#17D4D4', // Blue background
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24, // Left/right padding
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 180, // Logo width as specified
    height: 150, // Logo height as specified
  },
});

export default SplashScreen;