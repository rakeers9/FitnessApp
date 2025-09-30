// src/screens/onboarding/GetStartedScreen.tsx

import React from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Logo from '../../components/Logo';
import { BrandColors } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

const GetStartedScreen = () => {
  const navigation = useNavigation();

  const handleGetStarted = () => {
    navigation.navigate('Auth' as never);
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoSection}>
        <Logo
          width={180}
          color={BrandColors.terracotta500}
        />
      </View>

      <View style={styles.buttonSection}>
        <TouchableOpacity 
          style={styles.getStartedButton}
          onPress={handleGetStarted}
          activeOpacity={0.95}
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },
  logoSection: {
    flex: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: height * 0.1,
  },
  buttonSection: {
    flex: 0.4,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 48,
  },
  getStartedButton: {
    backgroundColor: BrandColors.terracotta500,
    // Removed borderColor and borderWidth
    borderRadius: 26,
    width: width * 0.8,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
});

export default GetStartedScreen;