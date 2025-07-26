// src/screens/auth/AuthStack.tsx - Placeholder

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AuthStack = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Auth Stack - Coming Soon!</Text>
      <Text style={styles.subtext}>Login/Signup screens will go here</Text>
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
  },
});

export default AuthStack;