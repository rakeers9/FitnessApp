// src/navigation/MainTabNavigator.tsx

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import WorkoutsScreen from '../screens/main/WorkoutsScreen';

const Tab = createBottomTabNavigator();

// Placeholder Profile Screen (temporary)
const ProfileScreen = () => (
  <View style={styles.placeholderContainer}>
    <Text style={styles.placeholderText}>Profile Screen</Text>
    <Text style={styles.placeholderSubtext}>Coming Soon!</Text>
  </View>
);

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#FFFFFF',
      }}
    >
      <Tab.Screen
        name="Workouts"
        component={WorkoutsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.tabIconContainer, focused && styles.activeTabIcon]}>
              <Image
                source={require('../../assets/home.png')}
                style={styles.homeIcon}
                resizeMode="contain"
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.tabIconContainer, focused && styles.activeTabIcon]}>
              <Ionicons
                name="person"
                size={24}
                color="#FFFFFF"
              />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#000000', // Dark navy background
    height: 72,
    paddingBottom: 8,
    paddingTop: 16,
    borderTopWidth: 0,
  },
  tabIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  activeTabIcon: {
    backgroundColor: '#17D4D4', // Turquoise circle for active tab
  },
  homeIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF', // This will make the icon white to match the design
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  placeholderText: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#192126',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#5A5A5A',
  },
});

export default MainTabNavigator;