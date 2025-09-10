import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { AuthStackParamList } from '../types';
import { setUser } from '../store/slices/authSlice';

const Stack = createStackNavigator<AuthStackParamList>();

const WelcomeScreen: React.FC = () => {
  const dispatch = useDispatch();

  const handleLogin = () => {
    try {
      // Temporary mock login for demo
      const mockUser = {
        id: '1',
        name: 'John Doe',
        phoneNumber: '+1234567890',
        email: 'john@example.com',
        isVerified: true,
        points: 150,
        badges: [],
        createdAt: new Date().toISOString(),
      };
      dispatch(setUser(mockUser));
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Civic Issue Tracker</Text>
      <Text style={styles.subtitle}>Report and track civic issues in your community</Text>
      <Button mode="contained" onPress={handleLogin} style={styles.button}>
        Login (Demo)
      </Button>
    </View>
  );
};

const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="Welcome" 
        component={WelcomeScreen} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
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
    marginBottom: 32,
    textAlign: 'center',
    color: '#666',
  },
  button: {
    marginTop: 20,
    width: 200,
  },
});

export default AuthNavigator;
