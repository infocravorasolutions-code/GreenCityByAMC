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
import AsyncStorage from '@react-native-async-storage/async-storage';

const formatDate = (date: Date) => {
  const monthsGujarati = [
    'જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ', 'મે', 'જૂન',
    'જુલાઈ', 'ઑગસ્ટ', 'સપ્ટેમ્બર', 'ઓક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર'
  ];
  const day = date.getDate();
  const month = monthsGujarati[date.getMonth()];
  const year = date.getFullYear();
  
  const toGujaratiNumerals = (num: number | string) => {
    const numerals: { [key: string]: string } = {
      '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪',
      '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯'
    };
    return String(num).split('').map(digit => numerals[digit] || digit).join('');
  };
  
  return `${toGujaratiNumerals(day)} ${month}, ${toGujaratiNumerals(year)}`;
};

const formatTime = (timeStr: string) => {
  if (!timeStr || timeStr === 'null') return '--:--';
  try {
    const date = new Date(timeStr);
    
    if (isNaN(date.getTime())) {
      return timeStr;
    }
    
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    
    return `${hours}:${minutesStr} ${ampm}`;
  } catch (e) {
    return timeStr;
  }
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
    fetchTodayStatus();
    // Refresh listener for when returning from Attendance screen
    const unsubscribe = navigation.addListener('focus', () => {
      fetchTodayStatus();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchLocalTodayAttendance = async () => {
    try {
      const savedStr = await AsyncStorage.getItem('@attendance_today');
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        const rDate = saved.date || saved.createdAt || saved.stepIn;
        if (rDate) {
          const localTodayStr = new Date().toLocaleDateString('en-CA');
          const recordDateStr = new Date(rDate).toLocaleDateString('en-CA');
          if (recordDateStr === localTodayStr) {
            return saved;
          }
        }
      }
    } catch (e) {
      console.error('[EmployeeDashboard] Fetching local attendance failed:', e);
    }
    return null;
  };

  const fetchTodayStatus = async () => {
    try {
      const response = await attendanceService.getTodayAttendance();
      const record = response?.attendance ?? response ?? null;
      const hasStepInVal = record && (record.stepIn || record.stepInTime);
      if (record && hasStepInVal && hasStepInVal !== 'null') {
        const normalized = {
          ...record,
          stepIn: record.stepIn || record.stepInTime,
          stepOut: record.stepOut || record.stepOutTime,
        };
        setAttendance(normalized);
        await AsyncStorage.setItem('@attendance_today', JSON.stringify(normalized));
      } else {
        const local = await fetchLocalTodayAttendance();
        setAttendance(local);
      }
    } catch (error: any) {
      if (error?.response?.status === 404) {
        const local = await fetchLocalTodayAttendance();
        setAttendance(local);
      } else {
        console.error('[EmployeeDashboard] Fetching attendance failed:', error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const isShiftEnded = () => {
    if (!attendance || !attendance.stepOut || attendance.stepOut === 'null') {
      return false;
    }
    const currentHour = new Date().getHours();
    const shift = String(attendance.shift || '').toLowerCase();
    
    if (shift.includes('night')) {
      // Night shift ends at 7 AM (so from 7 AM to 7 PM, night shift is over)
      return currentHour >= 7 && currentHour < 19;
    } else {
      // Day or morning shift ends at 7 PM (so from 7 PM onwards, day shift is over)
      return currentHour >= 19 || currentHour < 7;
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTodayStatus();
  };

  const handleLogout = async () => {
    Alert.alert('લૉગઆઉટ', 'શું તમે ખરેખર બહાર નીકળવા માંગો છો?', [
      { text: 'રદ કરો', style: 'cancel' },
      {
        text: 'બહાર નીકળો',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem('@attendance_today');
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

  const isSteppedIn = attendance && 
    (!!attendance.stepIn || !!attendance.stepInTime) && 
    attendance.stepIn !== 'null' && 
    attendance.stepInTime !== 'null' && 
    (!attendance.stepOut && !attendance.stepOutTime || attendance.stepOut === 'null' || attendance.stepOutTime === 'null');
  const hasStartedShift = attendance && 
    (!!attendance.stepIn || !!attendance.stepInTime) && 
    attendance.stepIn !== 'null' && 
    attendance.stepInTime !== 'null';

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
            <Text style={styles.greeting}>નમસ્તે,</Text>
            <Text style={styles.userName}>{user?.name || user?.fullName || 'કર્મચારી'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={22} color={Colors.error} />
          </TouchableOpacity>
        </View>

        {/* Status Card */}
        <View style={styles.statusSection}>
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Text style={styles.statusTitle}>આજની સ્થિતિ</Text>
              <Text style={styles.statusDate}>{formatDate(new Date())}</Text>
            </View>
            
            <View style={styles.statusIndicator}>
              {isSteppedIn ? (
                <>
                  <Clock size={48} color={Colors.warning} />
                  <Text style={[styles.statusMainText, { color: Colors.warning }]}>તમે હાલમાં કામ પર છો</Text>
                  <Text style={styles.statusSubText}>
                    હાજરી દાખલ સમય: {formatTime(attendance.stepIn)}
                  </Text>
                </>
              ) : hasStartedShift ? (
                isShiftEnded() ? (
                  <>
                    <CheckCircle2 size={48} color={Colors.primary} />
                    <Text style={[styles.statusMainText, { color: Colors.primary }]}>આજનું કામ પૂર્ણ થયું</Text>
                    <Text style={styles.statusSubText}>
                      તમે તમારી આજની શિફ્ટ પૂર્ણ કરી લીધી છે!
                    </Text>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={48} color={Colors.success} />
                    <Text style={[styles.statusMainText, { color: Colors.success }]}>તમે હાલમાં સ્ટેપ આઉટ છો</Text>
                    <Text style={styles.statusSubText}>
                      ફરી કામ શરૂ કરવા સ્ટેપ ઇન કરો
                    </Text>
                  </>
                )
              ) : (
                <>
                  <XCircle size={48} color={Colors.textSecondary} />
                  <Text style={[styles.statusMainText, { color: Colors.textSecondary }]}>આજે હાજરી નોંધાઈ નથી</Text>
                  <Text style={styles.statusSubText}>
                    હાજરી નોંધવા માટે નીચે ક્લિક કરો
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>ઝડપી સુવિધાઓ</Text>
          <ActionTile
            title="હાજરી નોંધો"
            description={isSteppedIn ? "કામ પૂરું કરવા હાજરી બહાર કરો (સ્ટેપ આઉટ)" : "કામ શરૂ કરવા હાજરી દાખલ કરો (સ્ટેપ ઇન)"}
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
