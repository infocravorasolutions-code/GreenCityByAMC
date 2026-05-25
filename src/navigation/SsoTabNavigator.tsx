import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, CalendarCheck, Users, ShieldCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography } from '../theme/Theme';

import SsoDashboardScreen from '../screens/SsoDashboardScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import StaffScreen from '../screens/StaffScreen';
import AttendanceReportScreen from '../screens/AttendanceReportScreen';
import SsoManagersScreen from '../screens/SsoManagersScreen';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();

export default function SsoTabNavigator() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isSupervisor = user?.role === 'supervisor';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        headerTitleStyle: {
          fontWeight: '900',
          fontSize: Typography.header,
          color: Colors.text,
        },
        headerShadowVisible: false,
        tabBarStyle: !isSupervisor ? { display: 'none' } : {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
          paddingTop: 10,
          elevation: 0,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '900',
        },
        tabBarButton: (props) => <TouchableOpacity {...props} activeOpacity={0.8} />,
      }}
    >
      <Tab.Screen
        name="HOME"
        component={SsoDashboardScreen}
        options={{
          tabBarIcon: ({ color }) => <Home size={32} color={color} />,
        }}
      />
      {isSupervisor && (
        <>
          <Tab.Screen
            name="ATTENDANCE"
            component={AttendanceScreen}
            options={{
              tabBarIcon: ({ color }) => <CalendarCheck size={32} color={color} />,
            }}
          />
          <Tab.Screen
            name="MY STAFF"
            component={StaffScreen}
            options={{
              tabBarIcon: ({ color }) => <Users size={32} color={color} />,
            }}
          />
          <Tab.Screen
            name="REPORTS"
            component={AttendanceReportScreen}
            options={{
              tabBarIcon: ({ color }) => <CalendarCheck size={32} color={color} />,
            }}
          />
          <Tab.Screen
            name="MANAGERS"
            component={SsoManagersScreen}
            options={{
              tabBarIcon: ({ color }) => <ShieldCheck size={32} color={color} />,
            }}
          />
        </>
      )}
    </Tab.Navigator>
  );
}
