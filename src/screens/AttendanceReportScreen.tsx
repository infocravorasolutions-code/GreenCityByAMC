import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { Users, CheckCircle, XCircle, Clock, Calendar, RefreshCcw } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../theme/Theme';
import { managerService } from '../services/managerService';

export default function AttendanceReportScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dashboard Metrics
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0
  });

  // Date Filters
  const [fromDate, setFromDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [toDate, setToDate] = useState(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Table Data
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    fetchReports();
  }, [fromDate, toDate]);

  const fetchReports = async () => {
    try {
      const fromParam = fromDate.toISOString().split('T')[0];
      const toParam = toDate.toISOString().split('T')[0];

      const data = await managerService.getStats(fromParam, toParam);
      console.log('[AttendanceReport] Data received:', JSON.stringify(data).slice(0, 300));

      let recordsList: any[] = [];
      if (Array.isArray(data)) recordsList = data;
      else if (data && data.attendance && Array.isArray(data.attendance)) recordsList = data.attendance;
      else if (data && data.data && Array.isArray(data.data)) recordsList = data.data;
      else if (data && data.records && Array.isArray(data.records)) recordsList = data.records;

      setRecords(recordsList);

      // Dynamically calculate metrics from the array
      let presentCount = 0;
      let lateCount = 0;
      let absentCount = 0;

      recordsList.forEach((r) => {
        const s = (r.status || 'present').toLowerCase();
        if (s.includes('present')) presentCount++;
        else if (s.includes('late')) lateCount++;
        else if (s.includes('absent')) absentCount++;
      });

      setStats({
        total: recordsList.length,
        present: presentCount,
        absent: absentCount,
        late: lateCount
      });

    } catch (err) {
      console.error('[AttendanceReport] Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  // Helper formatting to mock the table look
  const renderBadge = (text: string) => {
    if (!text) return null;
    const isMorning = text.toLowerCase().includes('morning');
    const isEvening = text.toLowerCase().includes('evening');
    const isNight = text.toLowerCase().includes('night');

    let bg = '#f1f5f9';
    let tx = '#64748b';
    if (isMorning) { bg = '#e0f2fe'; tx = '#0369a1'; }
    if (isEvening) { bg = '#ffedd5'; tx = '#c2410c'; }
    if (isNight) { bg = '#fae8ff'; tx = '#86198f'; }

    if (text.toLowerCase() === 'present') { bg = '#dcfce7'; tx = '#15803d'; }

    return (
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.badgeText, { color: tx }]}>{text}</Text>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.headerTitle}>Team Attendance</Text>
            <Text style={styles.headerSubtitle}>Monitor your team's attendance records</Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
            <RefreshCcw size={16} color={Colors.textSecondary} />
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={records}
        keyExtractor={(item, index) => item._id || String(index)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        contentContainerStyle={styles.listContent}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        ListHeaderComponent={() => (
          <View style={styles.cardsWrapper}>

            {/* Web Parity: Date Filters */}
            <View style={styles.dateFilterContainer}>
              <View style={styles.dateInputRow}>
                <View style={styles.dateInputCol}>
                  <Text style={styles.dateLabel}>From</Text>
                  <TouchableOpacity style={styles.dateBox} onPress={() => setShowFromPicker(true)}>
                    <Text style={styles.dateBoxText}>{fromDate.toLocaleDateString('en-GB')}</Text>
                    <Calendar size={16} color={Colors.textSecondary} />
                  </TouchableOpacity>
                  {showFromPicker && (
                    <DateTimePicker
                      value={fromDate}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowFromPicker(false);
                        if (selectedDate) setFromDate(selectedDate);
                      }}
                    />
                  )}
                </View>
                <View style={styles.dateInputCol}>
                  <Text style={styles.dateLabel}>To</Text>
                  <TouchableOpacity style={styles.dateBox} onPress={() => setShowToPicker(true)}>
                    <Text style={styles.dateBoxText}>{toDate.toLocaleDateString('en-GB')}</Text>
                    <Calendar size={16} color={Colors.textSecondary} />
                  </TouchableOpacity>
                  {showToPicker && (
                    <DateTimePicker
                      value={toDate}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowToPicker(false);
                        if (selectedDate) setToDate(selectedDate);
                      }}
                    />
                  )}
                </View>
              </View>
              <TouchableOpacity style={styles.runReportBtn} onPress={fetchReports}>
                <Text style={styles.runReportBtnText}>Run report</Text>
              </TouchableOpacity>
            </View>

            {/* Metric Cards mapped exactly to the web dashboard */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricsContainer}>
              <View style={[styles.metricCard, styles.cardShadow]}>
                <View>
                  <Text style={styles.metricLabel}>Total Records</Text>
                  <Text style={[styles.metricValue, { color: Colors.text }]}>{stats.total}</Text>
                </View>
                <Users size={28} color={Colors.textSecondary} />
              </View>

              <View style={[styles.metricCard, styles.cardShadow]}>
                <View>
                  <Text style={styles.metricLabel}>Present</Text>
                  <Text style={[styles.metricValue, { color: Colors.success }]}>{stats.present}</Text>
                </View>
                <CheckCircle size={28} color={Colors.success} />
              </View>

              <View style={[styles.metricCard, styles.cardShadow]}>
                <View>
                  <Text style={styles.metricLabel}>Absent</Text>
                  <Text style={[styles.metricValue, { color: Colors.error }]}>{stats.absent}</Text>
                </View>
                <XCircle size={28} color={Colors.error} />
              </View>

              <View style={[styles.metricCard, styles.cardShadow]}>
                <View>
                  <Text style={styles.metricLabel}>Late</Text>
                  <Text style={[styles.metricValue, { color: '#eab308' }]}>{stats.late}</Text>
                </View>
                <Clock size={28} color="#eab308" />
              </View>
            </ScrollView>

            <View style={styles.tableHeader}>
              <Text style={styles.tableSectionTitle}>Recent Logs</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Calendar size={48} color={Colors.border} />
            <Text style={{ color: Colors.textSecondary, marginTop: 10 }}>No attendance records found.</Text>
          </View>
        )}
        renderItem={({ item }) => {
          // Robust date/time fallback extraction
          const empName = item.employeeId?.name || item.employee?.name || item.name || 'Unknown';
          const empCode = item.employeeId?.empCode || item.employee?.empCode || item.empCode || '-';

          let stepInFormatted = '--:--';
          let stepOutFormatted = '--:--';

          const formatTime = (timeObj: any) => {
            if (!timeObj) return null;
            if (typeof timeObj === 'string') {
              if (timeObj.includes('T')) return new Date(timeObj).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return timeObj;
            }
            if (timeObj.time) return timeObj.time;
            return null;
          };

          stepInFormatted = formatTime(item.stepInTime) || formatTime(item.stepIn) || '--:--';
          stepOutFormatted = formatTime(item.stepOutTime) || formatTime(item.stepOut) || '--:--';

          return (
            <View style={styles.tableRow}>
              <View style={styles.employeeInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {empName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.empName}>{empName}</Text>
                  <Text style={styles.empCode}>{empCode}</Text>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricsScroll}>
                <View style={styles.metricCol}>
                  <Text style={styles.metricHeader}>Date</Text>
                  <Text style={styles.metricData}>{item.date ? new Date(item.date).toLocaleDateString() : (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A')}</Text>
                </View>

                <View style={styles.metricCol}>
                  <Text style={styles.metricHeader}>Shift</Text>
                  {renderBadge(item.shift)}
                </View>

                <View style={styles.metricCol}>
                  <Text style={styles.metricHeader}>Step In</Text>
                  <Text style={[styles.metricData, { fontWeight: '700' }]}>{stepInFormatted}</Text>
                </View>

                <View style={styles.metricCol}>
                  <Text style={styles.metricHeader}>Step Out</Text>
                  <Text style={[styles.metricData, { fontWeight: '700' }]}>{stepOutFormatted}</Text>
                </View>

                <View style={styles.metricCol}>
                  <Text style={styles.metricHeader}>Status</Text>
                  {renderBadge(item.status || 'Present')}
                </View>
              </ScrollView>

              {(item.note || item.stepInNote) && (
                <View style={styles.noteBox}>
                  <Text style={styles.noteText}>Note: {item.note || item.stepInNote}</Text>
                </View>
              )}
            </View>
          );
        }}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    top: 30,
    backgroundColor: Colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  listContent: {
    paddingBottom: 40,
  },
  cardsWrapper: {
    paddingTop: Spacing.md,
  },
  metricsContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  dateFilterContainer: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.soft,
  },
  dateInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  dateInputCol: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  dateLabel: {
    fontSize: Typography.small,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 6,
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
  },
  dateBoxText: {
    fontSize: 14,
    color: Colors.text,
  },
  runReportBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  runReportBtnText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  metricCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: 220,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardShadow: {
    ...Shadows.soft,
  },
  metricLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  tableHeader: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tableSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  tableRow: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.soft,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: Spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  avatarText: {
    color: Colors.surface,
    fontWeight: '800',
    fontSize: 16,
  },
  empName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  empCode: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  metricsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricCol: {
    marginRight: Spacing.xl,
    justifyContent: 'center',
  },
  metricHeader: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  metricData: {
    fontSize: 14,
    color: Colors.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  noteBox: {
    marginTop: Spacing.md,
    backgroundColor: '#f8fafc',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noteText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: Colors.textSecondary,
  }
});
