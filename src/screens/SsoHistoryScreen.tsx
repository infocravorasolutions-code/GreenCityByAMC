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
import { ArrowLeft, Clock, MapPin, PlayCircle, PauseCircle } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/Theme';
import { ssoService } from '../services/ssoService';

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
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  
  const [summaryData, setSummaryData] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (selectedVehicleId) {
      fetchVehicleData(selectedVehicleId);
    }
  }, [selectedVehicleId]);

  const fetchVehicles = async () => {
    try {
      const data = await ssoService.getLiveLocations();
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
      const [summaryResult, historyResult] = await Promise.all([
        ssoService.getVehicleSummary(vehicleId),
        ssoService.getVehicleHistory(vehicleId, 200)
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
        <Text style={styles.sectionLabel}>Select Vehicle</Text>
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
                  {vehicle.name || vehicle.vehicleNo || 'Unknown'}
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
        <Text style={styles.tableTitle}>
          Raw pings ({historyData?.total || 0} total, showing {historyData?.items?.length || 0})
        </Text>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Time</Text>
          <Text style={[styles.tableHeaderText, { flex: 1 }]}>Lat</Text>
          <Text style={[styles.tableHeaderText, { flex: 1 }]}>Lng</Text>
          <Text style={[styles.tableHeaderText, { flex: 0.8, textAlign: 'right' }]}>km/h</Text>
        </View>
      </View>
    </View>
  );

  const renderPingItem = ({ item, index }: { item: any; index: number }) => (
    <View style={[styles.tableRow, index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}>
      <Text style={[styles.tableRowText, { flex: 1.5 }]}>{formatTime(item.timestamp)}</Text>
      <Text style={[styles.tableRowText, { flex: 1 }]}>{item.latitude.toFixed(5)}</Text>
      <Text style={[styles.tableRowText, { flex: 1 }]}>{item.longitude.toFixed(5)}</Text>
      <Text style={[styles.tableRowText, { flex: 0.8, textAlign: 'right' }]}>{item.speedKph}</Text>
    </View>
  );

  if (loadingVehicles) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading Vehicles...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History</Text>
        <View style={{ width: 24 }} />
      </View>

      {loadingData ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading history logs...</Text>
        </View>
      ) : (
        <FlatList
          data={historyData?.items || []}
          renderItem={renderPingItem}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No ping history available.</Text>
            </View>
          }
        />
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
  vehicleSelectorContainer: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
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
    fontSize: 14,
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
    marginBottom: Spacing.sm,
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
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  tableRowEven: {
    backgroundColor: Colors.surface,
  },
  tableRowOdd: {
    backgroundColor: '#FAFAFA',
  },
  tableRowText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
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
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
});
