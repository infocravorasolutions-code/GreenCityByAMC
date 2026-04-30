import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import TabNavigator from './TabNavigator';
import { useAuth } from '../context/AuthContext';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { token, loading, user } = useAuth();

  // If auth is still loading, show splash screen
  if (loading) {
    return <SplashScreen />;
  }

  const isEmployee = user?.role === 'employee';

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {token ? (
        isEmployee ? (
          <Stack.Group>
            <Stack.Screen name="HOME" component={require('../screens/EmployeeDashboardScreen').default} />
            <Stack.Screen name="ATTENDANCE" component={require('../screens/EmployeeAttendanceScreen').default} />
          </Stack.Group>
        ) : (
          <Stack.Screen name="Main" component={TabNavigator} />
        )
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
