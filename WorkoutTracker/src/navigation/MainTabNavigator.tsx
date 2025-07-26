// src/navigation/MainTabNavigator.tsx - Placeholder

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MainTabNavigator = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Main App - Coming Soon!</Text>
      <Text style={styles.subtext}>Workouts, Progress, Library, Account tabs will go here</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
});

export default MainTabNavigator;