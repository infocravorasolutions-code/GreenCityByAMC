import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  SafeAreaView
} from 'react-native';
import {
  Users,
  CalendarCheck,
  BarChart3,
  LogOut,
  ChevronRight,
  Clock
} from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../theme/Theme';
import { useAuth } from '../context/AuthContext';
import { managerService } from '../services/managerService';

const { width } = Dimensions.get('window');

const ActionTile = ({ title, icon: Icon, color, onPress, description }: any) => (
  <TouchableOpacity
    style={[styles.actionTile, { borderLeftColor: color }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.tileIconContainer, { backgroundColor: `${color}15` }]}>
      <Icon size={32} color={color} />
    </View>
    <View style={styles.tileTextContainer}>
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileDescription}>{description}</Text>
    </View>
    <ChevronRight size={24} color={Colors.textSecondary} />
  </TouchableOpacity>
);

export default function DashboardScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    console.log('[Dashboard] Fetching summary for user:', user?.email, '| Role:', user?.role);
    try {
      const data = await managerService.getSummary();
      console.log('[Dashboard] Received summary data:', JSON.stringify(data));
      if (data && data.success) {
        setSummary(data.dashboard);
      } else {
        console.warn('[Dashboard] Summary data missing success flag or empty:', data);
      }
    } catch (error: any) {
      console.error('[Dashboard] Failed to fetch summary:', error);
      if (error.response?.status === 403) {
        setTimeout(() => {
          Alert.alert(
            'Permission Denied',
            'Your account does not have Manager permissions on this production server.'
          );
        }, 100);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch (e) {
            console.error('Logout failed:', e);
          }
        }
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.greeting}>Welcome,</Text>
            <Text style={styles.userName}>{user?.fullName || 'Manager'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutRightBtn} onPress={handleLogout}>
            <LogOut size={22} color={Colors.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary?.totalEmployees || 0}</Text>
            <Text style={styles.summaryLabel}>STAFF</Text>
          </View>
          <View style={[styles.summaryItem, { borderLeftWidth: 1, borderLeftColor: Colors.border }]}>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>{summary?.attendanceToday || 0}</Text>
            <Text style={styles.summaryLabel}>PRESENT</Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <ActionTile
            title="ATTENDANCE"
            description="Mark In / Mark Out"
            icon={CalendarCheck}
            color={Colors.success}
            onPress={() => navigation.navigate('STEP IN/OUT')}
          />
          <ActionTile
            title="MY EMPLOYEES"
            description="View & Manage Staff"
            icon={Users}
            color={Colors.primary}
            onPress={() => navigation.navigate('MY STAFF')}
          />
          <ActionTile
            title="HISTORY"
            description="View Past Attendance"
            icon={Clock}
            color={Colors.warning}
            onPress={() => navigation.navigate('REPORTS')}
          />
          <ActionTile
            title="REPORTS"
            description="Download Daily Reports"
            icon={BarChart3}
            color={Colors.secondary}
            onPress={() => navigation.navigate('REPORTS')}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Green City AMC Portal</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    top: 30,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    backgroundColor: Colors.surface,
  },
  logoutRightBtn: {
    padding: 8,
    backgroundColor: '#fef2f2',
    borderRadius: BorderRadius.sm,
  },
  headerTextWrap: {
    flex: 1,
  },
  greeting: {
    fontSize: Typography.label,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  userName: {
    fontSize: Typography.header,
    fontWeight: '800',
    color: Colors.text,
  },
  logoutButton: {
    padding: Spacing.sm,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: Typography.title,
    fontWeight: '900',
    color: Colors.primary,
  },
  summaryLabel: {
    fontSize: Typography.small,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginTop: 4,
  },
  actionsContainer: {
    padding: Spacing.md,
  },
  actionTile: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderLeftWidth: 8,
    ...Shadows.card,
  },
  tileIconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  tileTextContainer: {
    flex: 1,
  },
  tileTitle: {
    fontSize: Typography.header,
    fontWeight: '800',
    color: Colors.text,
  },
  tileDescription: {
    fontSize: Typography.label,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: Typography.small,
    color: Colors.textSecondary,
    opacity: 0.5,
  },
});

