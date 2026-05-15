import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { ArrowLeft, Clock, MapPin, PlayCircle, PauseCircle } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/Theme';
import { ssoService } from '../services/ssoService';

const { width } = Dimensions.get('window');

const formatSeconds = (totalSeconds: number) => {
  if (!totalSeconds) return '0m';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export default function SsoAnalyticsScreen({ navigation }: any) {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [tripData, setTripData] = useState<any>(null);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingTrip, setLoadingTrip] = useState(false);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (selectedVehicleId) {
      fetchTripData(selectedVehicleId);
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

  const fetchTripData = async (vehicleId: string) => {
    setLoadingTrip(true);
    setTripData(null);
    try {
      const result = await ssoService.getVehicleTrip(vehicleId);
      setTripData(result);
      if (result?.route && result.route.length > 0) {
        const js = `updateRoute(${JSON.stringify(result.route)})`;
        webViewRef.current?.injectJavaScript(js);
      }
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
          
          currentPolyline = L.polyline(routeData, {color: '#3b82f6', weight: 4}).addTo(map);
          
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
        <Text style={styles.headerTitle}>Trip Analytics</Text>
        <View style={{ width: 24 }} />
      </View>

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

      <View style={{ flex: 1 }}>
        {loadingTrip ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading Trip Data...</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            {/* KPI Cards */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
                  <MapPin size={20} color="#0EA5E9" />
                </View>
                <Text style={styles.statValue}>{tripData?.summary?.totalDistanceKm || 0} km</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
                  <PlayCircle size={20} color="#22C55E" />
                </View>
                <Text style={styles.statValue}>{formatSeconds(tripData?.summary?.totalRunningTimeSec)}</Text>
                <Text style={styles.statLabel}>Running Time</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
                  <PauseCircle size={20} color="#EF4444" />
                </View>
                <Text style={styles.statValue}>{formatSeconds(tripData?.summary?.totalStoppedTimeSec)}</Text>
                <Text style={styles.statLabel}>Stopped Time</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.iconBox, { backgroundColor: '#FEF9C3' }]}>
                  <Clock size={20} color="#EAB308" />
                </View>
                <Text style={styles.statValue}>{tripData?.summary?.stopsCount || 0}</Text>
                <Text style={styles.statLabel}>Stops</Text>
              </View>
            </View>

            {/* Map Section */}
            <View style={styles.mapContainer}>
              <Text style={styles.mapTitle}>Route Map</Text>
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
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
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
  mapContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadows.card,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  mapWrapper: {
    height: 300,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  map: {
    flex: 1,
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
