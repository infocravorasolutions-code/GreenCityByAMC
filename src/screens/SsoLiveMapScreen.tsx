import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { ArrowLeft, RefreshCcw, Layers } from 'lucide-react-native';
import { Colors, Spacing, Shadows } from '../theme/Theme';
import { ssoService } from '../services/ssoService';

const { width } = Dimensions.get('window');

export default function SsoLiveMapScreen({ navigation }: any) {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const fetchLocations = async () => {
    try {
      const data = await ssoService.getLiveLocations();
      setLocations(data);
      // Send data to WebView
      const js = `updateMarkers(${JSON.stringify(data)})`;
      webViewRef.current?.injectJavaScript(js);
    } catch (error) {
      console.error('Error fetching live locations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    const interval = setInterval(fetchLocations, 30000);
    return () => clearInterval(interval);
  }, []);

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
        .custom-marker {
          background-color: white;
          border: 2px solid #10b981;
          border-radius: 50%;
          text-align: center;
          line-height: 20px;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([23.0225, 72.5714], 13);
        
        var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        var googleRoadmap = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
          attribution: '&copy; Google'
        });

        var googleSatellite = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
          attribution: '&copy; Google'
        });

        var googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
          attribution: '&copy; Google'
        });

        var baseMaps = {
          "OpenStreetMap": osm,
          "Google Roadmap": googleRoadmap,
          "Google Satellite": googleSatellite,
          "Google Hybrid": googleHybrid
        };

        L.control.layers(baseMaps).addTo(map);

        var markers = {};

        function updateMarkers(locations) {
          locations.forEach(loc => {
            if(!loc.latestLocation) return;
            var color = loc.isOnline ? '#10b981' : '#6b7280';
            if (markers[loc._id]) {
              markers[loc._id].setLatLng([loc.latestLocation.latitude, loc.latestLocation.longitude]);
            } else {
              var marker = L.marker([loc.latestLocation.latitude, loc.latestLocation.longitude]).addTo(map);
              marker.bindPopup("<b>" + loc.name + "</b><br>Speed: " + loc.latestLocation.speedKph + " km/h");
              markers[loc._id] = marker;
            }
          });
        }
      </script>
    </body>
    </html>
  `;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Tracking (Leaflet)</Text>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={() => {
            setRefreshing(true);
            fetchLocations();
          }}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <RefreshCcw size={20} color={Colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: leafletHTML }}
          style={styles.map}
          onLoadEnd={() => {
            setLoading(false);
            if (locations.length > 0) {
              const js = `updateMarkers(${JSON.stringify(locations)})`;
              webViewRef.current?.injectJavaScript(js);
            }
          }}
        />
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Initializing Map...</Text>
          </View>
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
    ...Shadows.soft,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  refreshButton: {
    padding: Spacing.xs,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: 16,
  },
});
