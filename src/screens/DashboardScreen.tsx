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
  RefreshControl,
  StatusBar
} from 'react-native';
import {
  Users,
  CalendarCheck,
  BarChart3,
  LogOut,
  AlertTriangle,
  ChevronRight,
  Globe
} from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../theme/Theme';
import { useAuth } from '../context/AuthContext';
import { managerService } from '../services/managerService';
import { useTranslation } from '../context/LanguageContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - (Spacing.md * 2) - Spacing.md) / 2;

const GridActionCard = ({ title, translatedText, icon: Icon, color, onPress }: any) => (
  <View>
    <TouchableOpacity
      style={styles.gridCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.gridIconCircle, { backgroundColor: `${color}15` }]}>
        <Icon size={24} color={color} strokeWidth={2.5} />
      </View>
      <View style={styles.gridTextContainer}>
        <Text style={styles.gridTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.gridTranslated} numberOfLines={1}>{translatedText}</Text>
      </View>
    </TouchableOpacity>
  </View>
);

export default function DashboardScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useTranslation();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const toggleLanguage = () => {
    if (language === 'en') setLanguage('gu');
    else if (language === 'gu') setLanguage('hi');
    else setLanguage('en');
  };

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
    Alert.alert(t('dashboard.logout'), t('dashboard.logoutConfirm'), [
      { text: t('dashboard.cancel'), style: 'cancel' },
      {
        text: t('dashboard.logout'),
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

  if (loading && !summary) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* Modern Compact Header */}
      <View style={styles.headerArea}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.greeting}>{t('dashboard.hello')}</Text>
            <Text style={styles.userName} numberOfLines={1}>{user?.fullName || 'Manager'}</Text>
            <Text style={styles.roleText}>Manager Portal</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.langBtn} onPress={toggleLanguage}>
              <Globe size={16} color={Colors.surface} style={{ marginRight: 6 }} />
              <Text style={styles.langBtnText}>{language.toUpperCase()}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <LogOut size={20} color={Colors.surface} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* Unified Sleek Stats Card */}
        <View style={styles.unifiedStatsContainer}>
          <View style={styles.unifiedStatsCard}>
            <View style={styles.statSection}>
              <View style={styles.statHeader}>
                <Users size={16} color={Colors.primary} />
                <Text style={styles.statLabel}>{t('nav.staff')}</Text>
              </View>
              <Text style={styles.statNumber}>{summary?.totalEmployees || 0}</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statSection}>
              <View style={styles.statHeader}>
                <CalendarCheck size={16} color={Colors.success} />
                <Text style={styles.statLabel}>{t('staff.present')}</Text>
              </View>
              <Text style={styles.statNumber}>{summary?.attendanceToday || 0}</Text>
            </View>
          </View>
        </View>

        {/* Refined Quick Actions Grid */}
        <View style={styles.gridSection}>
          <Text style={styles.sectionTitle}>{t('dashboard.quickActions')}</Text>
          
          <View style={styles.gridContainer}>
            <GridActionCard
              title="Attendance"
              translatedText={t('attendance.stepInOut')}
              icon={CalendarCheck}
              color={Colors.success}
              delay={200}
              onPress={() => navigation.navigate('STEP IN/OUT')}
            />
            
            <GridActionCard
              title="My Tasks"
              translatedText={t('dashboard.wardTasks')}
              icon={AlertTriangle}
              color={Colors.error}
              delay={300}
              onPress={() => navigation.navigate('ManagerCcrList')}
            />

            <GridActionCard
              title="My Staff"
              translatedText={t('nav.staff')}
              icon={Users}
              color={Colors.primary}
              delay={400}
              onPress={() => navigation.navigate('MY STAFF')}
            />

            <GridActionCard
              title="Reports"
              translatedText={t('nav.reports')}
              icon={BarChart3}
              color={Colors.warning}
              delay={500}
              onPress={() => navigation.navigate('REPORTS')}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Green City AMC v1.0.0</Text>
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
  headerArea: {
    backgroundColor: Colors.primary,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  greeting: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginBottom: 2,
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.surface,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  roleText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.full,
    marginRight: 12,
  },
  langBtnText: {
    fontWeight: '700',
    color: Colors.surface,
    fontSize: 13,
  },
  logoutBtn: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.full,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  unifiedStatsContainer: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xl,
  },
  unifiedStatsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    ...Shadows.card,
    elevation: 4,
  },
  statSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  gridSection: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  gridCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.soft,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  gridIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  gridTextContainer: {
    marginTop: 4,
  },
  gridTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  gridTranslated: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  footer: {
    padding: Spacing.xl,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  footerText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    opacity: 0.5,
  },
});
