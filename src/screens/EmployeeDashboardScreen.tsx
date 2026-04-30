import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import {
  CalendarCheck,
  LogOut,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../theme/Theme';
import { useAuth } from '../context/AuthContext';
import { attendanceService } from '../services/attendanceService';

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const formatTime = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

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

export default function EmployeeDashboardScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Refresh listener for when returning from Attendance screen
    const unsubscribe = navigation.addListener('focus', () => {
      fetchTodayStatus();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchTodayStatus = async () => {
    try {
      const response = await attendanceService.getTodayAttendance();
      if (response) {
        setAttendance(response.attendance);
      }
    } catch (error) {
      console.error('[EmployeeDashboard] Fetching attendance failed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTodayStatus();
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

  const isSteppedIn = attendance && !attendance.stepOut;
  const isCompleted = attendance && attendance.stepOut;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        <View style={styles.topBar}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{user?.name || user?.fullName || 'Employee'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={22} color={Colors.error} />
          </TouchableOpacity>
        </View>

        {/* Status Card */}
        <View style={styles.statusSection}>
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Text style={styles.statusTitle}>Today's Status</Text>
              <Text style={styles.statusDate}>{formatDate(new Date())}</Text>
            </View>
            
            <View style={styles.statusIndicator}>
              {isCompleted ? (
                <>
                  <CheckCircle2 size={48} color={Colors.success} />
                  <Text style={[styles.statusMainText, { color: Colors.success }]}>Shift Completed</Text>
                  <Text style={styles.statusSubText}>
                    In: {formatTime(attendance.stepIn)} | Out: {formatTime(attendance.stepOut)}
                  </Text>
                </>
              ) : isSteppedIn ? (
                <>
                  <Clock size={48} color={Colors.warning} />
                  <Text style={[styles.statusMainText, { color: Colors.warning }]}>Currently Working</Text>
                  <Text style={styles.statusSubText}>
                    Stepped in at {formatTime(attendance.stepIn)}
                  </Text>
                </>
              ) : (
                <>
                  <XCircle size={48} color={Colors.textSecondary} />
                  <Text style={[styles.statusMainText, { color: Colors.textSecondary }]}>Not Started</Text>
                  <Text style={styles.statusSubText}>
                    You haven't stepped in yet today.
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <ActionTile
            title="MARK ATTENDANCE"
            description={isSteppedIn ? "Step Out of your shift" : "Step In to start your shift"}
            icon={CalendarCheck}
            color={Colors.primary}
            onPress={() => navigation.navigate('ATTENDANCE')}
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.xl,
    paddingTop: Spacing.xxl,
    backgroundColor: 'transparent',
  },
  headerTextWrap: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  logoutBtn: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.full,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  statusSection: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusDate: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  statusIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  statusMainText: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    letterSpacing: -0.5,
  },
  statusSubText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  actionsContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl * 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: Spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  actionTile: {
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderLeftWidth: 6,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  tileIconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  tileTextContainer: {
    flex: 1,
  },
  tileTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  tileDescription: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
});
