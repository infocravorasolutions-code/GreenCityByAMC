import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import TabNavigator from './TabNavigator';
import SsoTabNavigator from './SsoTabNavigator';
import { useAuth } from '../context/AuthContext';

// Import Screens
import EmployeeDashboardScreen from '../screens/EmployeeDashboardScreen';
import EmployeeAttendanceScreen from '../screens/EmployeeAttendanceScreen';
import SsoDashboardScreen from '../screens/SsoDashboardScreen';
import SsoCcrListScreen from '../screens/SsoCcrListScreen';
import SsoCreateCcrScreen from '../screens/SsoCreateCcrScreen';
import SsoCcrDetailScreen from '../screens/SsoCcrDetailScreen';
import SsoLiveMapScreen from '../screens/SsoLiveMapScreen';
import SsoAnalyticsScreen from '../screens/SsoAnalyticsScreen';
import SsoHistoryScreen from '../screens/SsoHistoryScreen';
import StaffScreen from '../screens/StaffScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import AttendanceReportScreen from '../screens/AttendanceReportScreen';
import SsoManagersScreen from '../screens/SsoManagersScreen';

import ManagerCcrListScreen from '../screens/ManagerCcrListScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { token, loading, user } = useAuth();

  // If auth is still loading, show splash screen
  if (loading) {
    return <SplashScreen />;
  }

  const isEmployee = user?.role === 'employee';
  const isSsoOrSupervisor = user?.role === 'sso' || user?.role === 'supervisor' || user?.role === 'admin';
  const isManager = user?.role === 'manager';

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {token ? (
        isEmployee ? (
          <Stack.Group>
            <Stack.Screen name="HOME" component={EmployeeDashboardScreen} />
            <Stack.Screen name="ATTENDANCE" component={EmployeeAttendanceScreen} />
          </Stack.Group>
        ) : isSsoOrSupervisor ? (
          <Stack.Group>
            <Stack.Screen name="MainSso" component={SsoTabNavigator} />
            <Stack.Screen name="SsoCcrList" component={SsoCcrListScreen} />
            <Stack.Screen name="SsoCreateCcr" component={SsoCreateCcrScreen} />
            <Stack.Screen name="SsoCcrDetail" component={SsoCcrDetailScreen} />
            <Stack.Screen name="SsoLiveMap" component={SsoLiveMapScreen} />
            <Stack.Screen name="SsoAnalytics" component={SsoAnalyticsScreen} />
            <Stack.Screen name="SsoHistory" component={SsoHistoryScreen} />
            <Stack.Screen name="SsoManagers" component={SsoManagersScreen} />
          </Stack.Group>
        ) : isManager ? (
          <Stack.Group>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen name="ManagerCcrList" component={ManagerCcrListScreen} />
          </Stack.Group>
        ) : (
          // Fallback: show login screen if role is unrecognised
          <Stack.Screen name="Login" component={LoginScreen} />
        )
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
