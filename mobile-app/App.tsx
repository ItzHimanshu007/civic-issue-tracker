import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import { Provider as PaperProvider, Button } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

function HomeScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>🏠 Civic Issue Tracker</Text>
      <Text style={styles.subtitle}>Report and track civic issues in your community</Text>
      <Button mode="contained" style={styles.button}>
        View Recent Issues
      </Button>
    </View>
  );
}

function MapScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>🗺️ Issue Map</Text>
      <Text style={styles.subtitle}>Interactive map showing all reported issues</Text>
      <Text style={styles.demo}>Map feature coming soon!</Text>
    </View>
  );
}

function ReportsScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>📄 My Reports</Text>
      <Text style={styles.subtitle}>Your submitted issues and their status</Text>
      <Button mode="outlined" style={styles.button}>
        Create New Report
      </Button>
    </View>
  );
}

function ProfileScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>👤 Profile</Text>
      <Text style={styles.subtitle}>Your account and achievements</Text>
      <Text style={styles.demo}>John Doe - 150 points</Text>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused, color, size }) => {
                let iconName;
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
          <StatusBar style="auto" />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#2E7D32',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
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
  button: {
    marginTop: 20,
    width: 200,
  },
});
