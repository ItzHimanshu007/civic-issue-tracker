import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MainTabParamList } from '../types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const HomeScreen: React.FC = () => (
  <View style={styles.screen}>
    <Text style={styles.title}>Recent Issues</Text>
    <Text style={styles.subtitle}>View and track civic issues in your area</Text>
  </View>
);

const MapScreen: React.FC = () => (
  <View style={styles.screen}>
    <Text style={styles.title}>Issue Map</Text>
    <Text style={styles.subtitle}>Interactive map showing all reported issues</Text>
  </View>
);

const ReportsScreen: React.FC = () => (
  <View style={styles.screen}>
    <Text style={styles.title}>My Reports</Text>
    <Text style={styles.subtitle}>Your submitted issues and their status</Text>
  </View>
);

const ProfileScreen: React.FC = () => (
  <View style={styles.screen}>
    <Text style={styles.title}>Profile</Text>
    <Text style={styles.subtitle}>Your account settings and achievements</Text>
  </View>
);

const MainNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof MaterialIcons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Map':
              iconName = 'map';
              break;
            case 'Reports':
              iconName = 'report';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'home';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2E7D32',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#2E7D32',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2E7D32',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
});

export default MainNavigator;
