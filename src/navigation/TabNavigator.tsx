import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, CalendarCheck, Users, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography } from '../theme/Theme';

import DashboardScreen from '../screens/DashboardScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import StaffScreen from '../screens/StaffScreen';
import AttendanceReportScreen from '../screens/AttendanceReportScreen';

import EmployeeDashboardScreen from '../screens/EmployeeDashboardScreen';
import EmployeeAttendanceScreen from '../screens/EmployeeAttendanceScreen';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useTranslation();

  const isEmployee = user?.role === 'employee';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
          elevation: 0,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '900',
        },
        headerStyle: {
          backgroundColor: Colors.surface,
        },
        headerTitleStyle: {
          fontWeight: '900',
          fontSize: Typography.header,
          color: Colors.text,
        },
        headerShadowVisible: false,
        tabBarButton: (props) => <TouchableOpacity {...props} activeOpacity={0.8} />,
      }}
    >
          <Tab.Screen
            name="HOME"
            component={DashboardScreen}
            options={{
              tabBarLabel: t('nav.home'),
              tabBarIcon: ({ color }) => <Home size={32} color={color} />,
            }}
          />
          <Tab.Screen
            name="STEP IN/OUT"
            component={AttendanceScreen}
            options={{
              tabBarLabel: t('nav.stepIn'),
              tabBarIcon: ({ color }) => <CalendarCheck size={32} color={color} />,
            }}
          />
          <Tab.Screen
            name="MY STAFF"
            component={StaffScreen}
            options={{
              tabBarLabel: t('nav.staff'),
              tabBarIcon: ({ color }) => <Users size={32} color={color} />,
            }}
          />
          <Tab.Screen
            name="REPORTS"
            component={AttendanceReportScreen}
            options={{
              tabBarLabel: t('nav.reports'),
              tabBarIcon: ({ color }) => <CalendarCheck size={32} color={color} />,
            }}
          />
    </Tab.Navigator>
  );
}
