import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { ArrowLeft, Truck, PlayCircle, PauseCircle, Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/Theme';
import { ssoService } from '../services/ssoService';
import { useAuth } from '../context/AuthContext';

const formatTripTime = (timeString?: string) => {
  if (!timeString) return '--:--';
  try {
    const d = new Date(timeString);
    if (isNaN(d.getTime())) return '--:--';
    
    // Format to a clean, easy-to-read localized time: e.g. "09:30 AM"
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return '--:--';
  }
};

export default function SsoAnalyticsScreen({ navigation }: any) {
  const { user } = useAuth();
  const isSupervisor = user?.role === 'supervisor';
  
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [tripData, setTripData] = useState<any>(null);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingTrip, setLoadingTrip] = useState(false);
  const webViewRef = useRef<WebView>(null);

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
  }, []);

  useEffect(() => {
    if (selectedVehicleId) {
      fetchTripData(selectedVehicleId);
    }
  }, [selectedVehicleId, selectedDate]);

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

  const fetchTripData = async (vehicleId: string) => {
    setLoadingTrip(true);
    setTripData(null);
    try {
      // SSO role strictly loads today's data (no selectedDate parameter passed to prevent 400 error)
      const result = await ssoService.getVehicleTrip(vehicleId, isSupervisor ? selectedDate : undefined);
      setTripData(result);
    } catch (error) {
      console.error('Error fetching trip data:', error);
    } finally {
      setLoadingTrip(false);
    }
  };

  const leafletHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100vw; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([23.0225, 72.5714], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        var currentPolyline = null;
        var startMarker = null;
        var endMarker = null;

        function updateRoute(routeData) {
          if (!routeData || routeData.length === 0) return;
          
          if (currentPolyline) map.removeLayer(currentPolyline);
          if (startMarker) map.removeLayer(startMarker);
          if (endMarker) map.removeLayer(endMarker);
          
          currentPolyline = L.polyline(routeData, {color: '#4f46e5', weight: 4}).addTo(map);
          
          var startPoint = routeData[0];
          var endPoint = routeData[routeData.length - 1];
          
          startMarker = L.circleMarker(startPoint, { color: '#10b981', radius: 6, fillOpacity: 1 }).addTo(map);
          endMarker = L.circleMarker(endPoint, { color: '#ef4444', radius: 6, fillOpacity: 1 }).addTo(map);

          map.fitBounds(currentPolyline.getBounds(), { padding: [30, 30] });
        }
      </script>
    </body>
    </html>
  `;

  useEffect(() => {
    if (tripData?.route && tripData.route.length > 0) {
      const js = `updateRoute(${JSON.stringify(tripData.route)})`;
      webViewRef.current?.injectJavaScript(js);
    }
  }, [tripData]);

  if (loadingVehicles) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading vehicles...</Text>
      </View>
    );
  }

  const start = tripData?.summary?.startPoint?.time;
  const end = tripData?.summary?.endPoint?.time;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Map</Text>
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

      {/* Vehicle Selector Chips */}
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

      {/* Main Content Area */}
      <View style={{ flex: 1 }}>
        {loadingTrip ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading route & times...</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            {/* Trip Times Card */}
            <View style={styles.timeCard}>
              <View style={styles.timeBlock}>
                <View style={styles.timeLabelContainer}>
                  <PlayCircle size={18} color="#22C55E" style={{ marginRight: 6 }} />
                  <Text style={styles.timeLabel}>START TIME</Text>
                </View>
                <Text style={[styles.timeValue, start ? styles.timeActive : styles.timeEmpty]}>
                  {formatTripTime(start)}
                </Text>
              </View>

              <View style={styles.verticalDivider} />

              <View style={styles.timeBlock}>
                <View style={styles.timeLabelContainer}>
                  <PauseCircle size={18} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={styles.timeLabel}>END TIME</Text>
                </View>
                <Text style={[styles.timeValue, end ? styles.timeActive : styles.timeEmpty]}>
                  {formatTripTime(end)}
                </Text>
              </View>
            </View>

            {/* Leaflet WebView Map */}
            <View style={styles.mapContainer}>
              <View style={styles.mapTitleRow}>
                <Truck size={18} color={Colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.mapTitle}>Route & Start/End Points</Text>
              </View>
              <View style={styles.mapWrapper}>
                <WebView
                  ref={webViewRef}
                  originWhitelist={['*']}
                  source={{ html: leafletHTML }}
                  style={styles.map}
                  scrollEnabled={false}
                  onLoadEnd={() => {
                    if (tripData?.route && tripData.route.length > 0) {
                      const js = `updateRoute(${JSON.stringify(tripData.route)})`;
                      webViewRef.current?.injectJavaScript(js);
                    }
                  }}
                />
              </View>
              {(!tripData?.route || tripData.route.length === 0) && (
                <View style={styles.noRouteOverlay}>
                  <Text style={styles.noRouteText}>No coordinate data recorded for this date.</Text>
                </View>
              )}
            </View>

          </ScrollView>
        )}
      </View>
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
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  timeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  timeBlock: {
    flex: 1,
  },
  timeLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '855',
    marginTop: 2,
  },
  timeActive: {
    color: Colors.text,
  },
  timeEmpty: {
    color: Colors.textSecondary,
  },
  verticalDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
  },
  mapContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
    position: 'relative',
  },
  mapTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  mapTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  mapWrapper: {
    height: 380,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  map: {
    flex: 1,
  },
  noRouteOverlay: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: Spacing.xl,
    right: Spacing.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
  },
  noRouteText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
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
});
