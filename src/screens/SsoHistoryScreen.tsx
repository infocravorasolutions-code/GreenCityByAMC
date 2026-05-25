import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, MapPin, PlayCircle, PauseCircle, Calendar, ChevronLeft, ChevronRight, Truck } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/Theme';
import { ssoService } from '../services/ssoService';
import { useAuth } from '../context/AuthContext';

const formatSeconds = (totalSeconds: number) => {
  if (!totalSeconds) return '0m';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatTime = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }).toLowerCase();
};

export default function SsoHistoryScreen({ navigation }: any) {
  const { user, selectedZone } = useAuth();
  const isSupervisor = user?.role === 'supervisor';
  
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  
  const [summaryData, setSummaryData] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  const formatDisplayDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(undefined, { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    if (selectedDate >= todayStr) return;
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  useEffect(() => {
    fetchVehicles();
  }, [selectedZone]);

  useEffect(() => {
    if (selectedVehicleId) {
      fetchVehicleData(selectedVehicleId);
    }
  }, [selectedVehicleId, selectedDate, selectedZone]);

  const fetchVehicles = async () => {
    try {
      const data = await ssoService.getLiveLocations(selectedZone || undefined);
      setVehicles(data);
      if (data.length > 0) {
        setSelectedVehicleId(data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const fetchVehicleData = async (vehicleId: string) => {
    setLoadingData(true);
    setSummaryData(null);
    setHistoryData(null);
    try {
      // SSO role strictly loads today's data (no selectedDate parameter passed to prevent 400 error)
      const dateParam = isSupervisor ? selectedDate : undefined;
      const zoneParam = selectedZone || undefined;
      const [summaryResult, historyResult] = await Promise.all([
        ssoService.getVehicleSummary(vehicleId, dateParam, zoneParam),
        ssoService.getVehicleHistory(vehicleId, dateParam, 200, zoneParam)
      ]);
      setSummaryData(summaryResult);
      setHistoryData(historyResult);
    } catch (error) {
      console.error('Error fetching vehicle data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Vehicle Selector */}
      <View style={styles.vehicleSelectorContainer}>
        <Text style={styles.sectionLabel}>SELECT VEHICLE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehicleList}>
          {vehicles.map(vehicle => {
            const isSelected = vehicle._id === selectedVehicleId;
            return (
              <TouchableOpacity
                key={vehicle._id}
                style={[styles.vehicleChip, isSelected && styles.vehicleChipSelected]}
                onPress={() => setSelectedVehicleId(vehicle._id)}
              >
                <Text style={[styles.vehicleChipText, isSelected && styles.vehicleChipTextSelected]}>
                  {vehicle.numberPlate || vehicle.name || 'Unknown'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* KPI Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
            <MapPin size={20} color="#0EA5E9" />
          </View>
          <Text style={styles.statValue}>{summaryData?.report?.totalDistanceKm || 0} km</Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
            <PlayCircle size={20} color="#22C55E" />
          </View>
          <Text style={styles.statValue}>{formatSeconds(summaryData?.report?.totalRunningTimeSec)}</Text>
          <Text style={styles.statLabel}>Running Time</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
            <PauseCircle size={20} color="#EF4444" />
          </View>
          <Text style={styles.statValue}>{formatSeconds(summaryData?.report?.totalStoppedTimeSec)}</Text>
          <Text style={styles.statLabel}>Stopped Time</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.iconBox, { backgroundColor: '#FEF9C3' }]}>
            <Clock size={20} color="#EAB308" />
          </View>
          <Text style={styles.statValue}>{summaryData?.report?.stopsCount || 0}</Text>
          <Text style={styles.statLabel}>Stops</Text>
        </View>
      </View>

      {/* Pings Section Header */}
      <View style={styles.tableSection}>
        <Text style={styles.tableTitle}>Trip Summary</Text>
        
        {historyData?.items && historyData.items.length > 0 ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryIconBox}>
                <Truck size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.summaryLabel}>VEHICLE</Text>
                <Text style={styles.summaryValue}>
                  {vehicles.find(v => v._id === selectedVehicleId)?.numberPlate || 
                   vehicles.find(v => v._id === selectedVehicleId)?.name || 'Unknown'}
                </Text>
              </View>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryRow}>
              <View style={[styles.summaryIconBox, { backgroundColor: '#DCFCE7' }]}>
                <PlayCircle size={20} color="#22C55E" />
              </View>
              <View>
                <Text style={styles.summaryLabel}>START TIME</Text>
                <Text style={styles.summaryValue}>
                  {formatTime(historyData.items[historyData.items.length - 1].timestamp)}
                </Text>
              </View>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryRow}>
              <View style={[styles.summaryIconBox, { backgroundColor: '#FEE2E2' }]}>
                <PauseCircle size={20} color="#EF4444" />
              </View>
              <View>
                <Text style={styles.summaryLabel}>END TIME</Text>
                <Text style={styles.summaryValue}>
                  {formatTime(historyData.items[0].timestamp)}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No trip history available for this date.</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loadingVehicles) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading vehicles...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Raw History</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Dynamic Date Banner based on Role */}
      {isSupervisor ? (
        <View style={styles.dateBanner}>
          <TouchableOpacity style={styles.dateButton} onPress={handlePrevDay}>
            <ChevronLeft size={20} color={Colors.primary} />
            <Text style={styles.dateButtonText}>Prev</Text>
          </TouchableOpacity>

          <View style={styles.dateCenter}>
            <Calendar size={18} color={Colors.primary} style={{ marginRight: Spacing.xs }} />
            <Text style={styles.dateText}>{formatDisplayDate(selectedDate)}</Text>
          </View>

          <TouchableOpacity 
            style={[styles.dateButton, selectedDate >= todayStr && styles.dateButtonDisabled]} 
            onPress={handleNextDay}
            disabled={selectedDate >= todayStr}
          >
            <Text style={[styles.dateButtonText, selectedDate >= todayStr && styles.dateButtonTextDisabled]}>Next</Text>
            <ChevronRight size={20} color={selectedDate >= todayStr ? Colors.textSecondary : Colors.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.staticDateBanner}>
          <Calendar size={18} color={Colors.primary} style={{ marginRight: Spacing.sm }} />
          <Text style={styles.staticDateText}>Today • {formatDisplayDate(todayStr)}</Text>
        </View>
      )}

      {loadingData ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading history data...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {renderHeader()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  headerContent: {
    backgroundColor: Colors.background,
  },
  dateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  staticDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateButtonDisabled: {
    opacity: 0.5,
    backgroundColor: Colors.surface,
  },
  dateButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    marginHorizontal: 4,
  },
  dateButtonTextDisabled: {
    color: Colors.textSecondary,
  },
  dateCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  staticDateText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  vehicleSelectorContainer: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    letterSpacing: 1.2,
  },
  vehicleList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  vehicleChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  vehicleChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  vehicleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  vehicleChipTextSelected: {
    color: Colors.surface,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  tableSection: {
    backgroundColor: Colors.surface,
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
  },
  tableTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  summaryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: 16,
  },
  emptyContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
});
