import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MainTabParamList } from '../types';
import ReportsListScreen from '../screens/ReportsListScreen';
import CreateReportScreen from '../screens/CreateReportScreen';
import { useNavigation } from '@react-navigation/native';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator();

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Civic Issue Tracker</Text>
      <Text style={styles.subtitle}>Report and track civic issues in your area</Text>
      <Text style={styles.demo}>🏠 Welcome to the Mobile App!</Text>
      
      <TouchableOpacity 
        style={styles.createButton} 
        onPress={() => navigation.navigate('CreateReport')}
      >
        <MaterialIcons name="add-circle" size={24} color="#fff" />
        <Text style={styles.createButtonText}>Create New Report</Text>
      </TouchableOpacity>
      
      <Text style={styles.instructions}>
        • Tap "Reports" tab to see all reports{"\n"}
        • Create a new report to test the connection{"\n"}
        • Reports will appear in the admin web portal
      </Text>
    </View>
  );
};

const MapScreen: React.FC = () => (
  <View style={styles.screen}>
    <Text style={styles.title}>Issue Map</Text>
    <Text style={styles.subtitle}>Interactive map showing all reported issues</Text>
    <Text style={styles.demo}>🗺️ Map feature coming soon!</Text>
  </View>
);

const ReportsScreen: React.FC = () => {
  return <ReportsListScreen />;
};

const ProfileScreen: React.FC = () => (
  <View style={styles.screen}>
    <Text style={styles.title}>Profile</Text>
    <Text style={styles.subtitle}>Your account settings and achievements</Text>
    <Text style={styles.demo}>👤 John Doe - 150 points</Text>
  </View>
);

// Create a stack navigator to include CreateReport screen
const MainTabNavigator: React.FC = () => {
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

const MainNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2E7D32',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabNavigator} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CreateReport" 
        component={CreateReportScreen} 
        options={{ title: 'Create New Report' }}
      />
    </Stack.Navigator>
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
  demo: {
    fontSize: 18,
    marginTop: 20,
    textAlign: 'center',
    color: '#2E7D32',
    fontWeight: '600',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 32,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  instructions: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginTop: 32,
    lineHeight: 20,
  },
});

export default MainNavigator;
