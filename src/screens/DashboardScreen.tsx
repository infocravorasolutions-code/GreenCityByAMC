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
  SafeAreaView,
  RefreshControl
} from 'react-native';
import {
  Users,
  CalendarCheck,
  BarChart3,
  LogOut,
  ChevronRight,
  AlertTriangle
} from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../theme/Theme';
import { useAuth } from '../context/AuthContext';
import { managerService } from '../services/managerService';

const { width } = Dimensions.get('window');

const MassiveActionCard = ({ title, subTitle, gujaratiText, icon: Icon, color, onPress }: any) => (
  <TouchableOpacity
    style={[styles.massiveCard, { borderBottomColor: color }]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={[styles.iconCircle, { backgroundColor: `${color}15` }]}>
      <Icon size={40} color={color} />
    </View>
    <View style={styles.cardContent}>
      <Text style={[styles.gujaratiText, { color }]}>{gujaratiText}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubTitle}>{subTitle}</Text>
    </View>
    <ChevronRight size={32} color={Colors.border} />
  </TouchableOpacity>
);

export default function DashboardScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const data = await managerService.getSummary();
      if (data && data.success) {
        setSummary(data.dashboard);
      }
    } catch (error: any) {
      console.error('[Dashboard] Failed to fetch summary:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSummary();
  };

  const handleLogout = () => {
    Alert.alert('Logout (લોગઆઉટ)', 'Are you sure you want to sign out?', [
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
      <View style={styles.topBar}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.greeting}>સ્વાગત છે (Welcome),</Text>
          <Text style={styles.userName}>{user?.fullName || 'Manager'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={24} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        
        {/* Massive Stats Display */}
        <View style={styles.statsContainer}>
          <View style={[styles.statBox, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
            <Text style={[styles.statNumber, { color: '#1d4ed8' }]}>{summary?.totalEmployees || 0}</Text>
            <Text style={styles.statLabelGu}>સ્ટાફ (Staff)</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#ecfdf5', borderColor: '#bbf7d0' }]}>
            <Text style={[styles.statNumber, { color: '#15803d' }]}>{summary?.attendanceToday || 0}</Text>
            <Text style={styles.statLabelGu}>હાજર (Present)</Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <MassiveActionCard
            title="ATTENDANCE"
            subTitle="Mark In / Mark Out"
            gujaratiText="હાજરી ભરો"
            icon={CalendarCheck}
            color={Colors.success}
            onPress={() => navigation.navigate('STEP IN/OUT')}
          />
          
          <MassiveActionCard
            title="MY TASKS"
            subTitle="View CCR Tickets"
            gujaratiText="મારા કામ"
            icon={AlertTriangle}
            color={Colors.error}
            onPress={() => navigation.navigate('ManagerCcrList')}
          />

          <MassiveActionCard
            title="MY STAFF"
            subTitle="View Employees"
            gujaratiText="મારો સ્ટાફ"
            icon={Users}
            color={Colors.primary}
            onPress={() => navigation.navigate('MY STAFF')}
          />

          <MassiveActionCard
            title="REPORTS"
            subTitle="History & Data"
            gujaratiText="રિપોર્ટ્સ જુઓ"
            icon={BarChart3}
            color={Colors.warning}
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
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    backgroundColor: Colors.surface,
    ...Shadows.soft,
    zIndex: 10,
  },
  headerTextWrap: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginBottom: 4,
  },
  userName: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.text,
  },
  logoutBtn: {
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    ...Shadows.soft,
  },
  statNumber: {
    fontSize: 48,
    fontWeight: '900',
    marginBottom: 8,
  },
  statLabelGu: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  actionsContainer: {
    padding: Spacing.md,
  },
  massiveCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderBottomWidth: 6,
    ...Shadows.card,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  cardContent: {
    flex: 1,
  },
  gujaratiText: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 2,
  },
  cardSubTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  footer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '700',
    opacity: 0.5,
  },
});

