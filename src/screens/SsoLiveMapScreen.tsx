import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { ArrowLeft, RefreshCcw, Layers, MapPin, ChevronDown, CheckCircle2 } from 'lucide-react-native';
import { Colors, Spacing, Shadows } from '../theme/Theme';
import { ssoService } from '../services/ssoService';
import { socketService } from '../services/socketService';

import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export default function SsoLiveMapScreen({ navigation }: any) {
  const { selectedZone, setSelectedZone, token, user } = useAuth();
  const userZones = user?.zones || (user as any)?.supervisorZones || [];
  const hasMultipleZones = userZones.length > 1;
  const [showZonePicker, setShowZonePicker] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const locationsRef = useRef<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [webViewReady, setWebViewReady] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const fetchLocations = async () => {
    try {
      const data = await ssoService.getLiveLocations(selectedZone || undefined);
      setLocations(data);
      locationsRef.current = data;
    } catch (error) {
      console.error('Error fetching live locations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (webViewReady && locations.length > 0) {
      const js = `updateMarkers(${JSON.stringify(locations)})`;
      webViewRef.current?.injectJavaScript(js);
    }
  }, [webViewReady, locations]);

  useEffect(() => {
    fetchLocations();
    
    // Connect socket
    if (token && user?.tenantId) {
      socketService.connect(token, user.tenantId);
    }

    const unsubscribe = socketService.subscribeToVehicles((evt: any) => {
      console.log('[LiveMap] Received vehicle update:', evt);
      // Filter: only process updates for vehicles we already know about in the current zone
      const knownVehicle = locationsRef.current.find(v => v._id === evt.vehicleId);
      if (knownVehicle && evt.lat && evt.lng) {
        console.log('[LiveMap] Updating known vehicle on map:', evt.vehicleId, knownVehicle.name);
        const js = `updateSingleMarker("${evt.vehicleId}", ${evt.lat}, ${evt.lng}, ${evt.speed || 0}, "${knownVehicle.name || 'Vehicle'}", ${evt.isOnline})`;
        webViewRef.current?.injectJavaScript(js);
      } else if (!knownVehicle && evt.lat && evt.lng) {
        console.log('[LiveMap] Plotting unknown vehicle:', evt.vehicleId);
        const js = `updateSingleMarker("${evt.vehicleId}", ${evt.lat}, ${evt.lng}, ${evt.speed || 0}, "Unknown Vehicle", ${evt.isOnline})`;
        webViewRef.current?.injectJavaScript(js);
      }
    });

    return () => {
      unsubscribe();
      socketService.disconnect();
    };
  }, [selectedZone, token]);

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
        /* Smooth transition for marker movement */
        .leaflet-marker-icon, .leaflet-marker-shadow {
          transition: transform 0.8s linear !important;
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

        function sendDirection(lat, lng) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DIRECTION', lat: lat, lng: lng }));
        }

        function createVehicleIcon(isOnline) {
          return L.divIcon({
            className: 'custom-div-icon',
            html: \`<div style="background-color:\${isOnline ? '#10b981' : '#94a3b8'}; width:32px; height:32px; border-radius:50%; border:3px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:white;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10 11 11 .9c.6 0 .9.5.8 1.1l-.8 5h-1"/><path d="M16 18h-5"/><path d="M18 5a1 1 0 0 0-1 1v5.573"/><path d="M3 4h9l1 7.246"/><path d="M4 11V4"/><path d="M7 15h.01"/><path d="M8 10.1V4"/><circle cx="18" cy="18" r="2"/><circle cx="7" cy="15" r="5"/></svg>
            </div>\`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
          });
        }

        function updateMarkers(locations) {
          if (!locations || locations.length === 0) return;
          var bounds = [];
          locations.forEach(loc => {
            if (!loc.latestLocation || typeof loc.latestLocation.latitude !== 'number' || typeof loc.latestLocation.longitude !== 'number') return;
            var latLng = [loc.latestLocation.latitude, loc.latestLocation.longitude];
            var heading = loc.latestLocation.heading || 0;
            bounds.push(latLng);
            
            var popupContent = "<div style='display:flex; justify-content:space-between; align-items:center; min-width:140px;'>" +
              "<div><b style='font-size:14px;'>" + (loc.name || 'Vehicle') + "</b><br><span style='color:#64748b;font-size:12px;'>Speed: " + (loc.latestLocation.speedKph || 0) + " km/h</span></div>" +
              "<button onclick='sendDirection(" + latLng[0] + ", " + latLng[1] + ")' style='background-color:#3b82f6;color:white;border:none;width:36px;height:36px;border-radius:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(59,130,246,0.4); margin-left:12px;' title='Get Directions'>" +
              "<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polygon points='3 11 22 2 13 21 11 13 3 11'/></svg></button></div>";

            if (markers[loc._id]) {
              markers[loc._id].setLatLng(latLng);
              markers[loc._id].setIcon(createVehicleIcon(loc.isOnline));
              markers[loc._id].setPopupContent(popupContent);
            } else {
              var marker = L.marker(latLng, { icon: createVehicleIcon(loc.isOnline) }).addTo(map);
              marker.bindPopup(popupContent);
              markers[loc._id] = marker;
            }
          });
          if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [40, 40] });
          }
        }

        function updateSingleMarker(vehicleId, lat, lng, speed, name, isOnline) {
          var latLng = [lat, lng];
          var popupContent = "<div style='display:flex; justify-content:space-between; align-items:center; min-width:140px;'>" +
            "<div><b style='font-size:14px;'>" + name + "</b><br><span style='color:#64748b;font-size:12px;'>Speed: " + speed + " km/h</span></div>" +
            "<button onclick='sendDirection(" + lat + ", " + lng + ")' style='background-color:#3b82f6;color:white;border:none;width:36px;height:36px;border-radius:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(59,130,246,0.4); margin-left:12px;' title='Get Directions'>" +
            "<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polygon points='3 11 22 2 13 21 11 13 3 11'/></svg></button></div>";

          if (markers[vehicleId]) {
            markers[vehicleId].setLatLng(latLng);
            if (isOnline !== undefined) markers[vehicleId].setIcon(createVehicleIcon(isOnline));
            markers[vehicleId].setPopupContent(popupContent);
          } else {
            var marker = L.marker(latLng, { icon: createVehicleIcon(isOnline) }).addTo(map);
            marker.bindPopup(popupContent);
            markers[vehicleId] = marker;
          }
        }
      </script>
    </body>
    </html>
  `;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={{ marginLeft: Spacing.sm }}>
            <Text style={styles.headerTitle}>Live Tracking</Text>
            <View style={styles.zoneWrapper}>
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center' }}
                onPress={() => hasMultipleZones && setShowZonePicker(true)}
                disabled={!hasMultipleZones}
              >
                <MapPin size={12} color={Colors.primary} />
                <Text style={styles.zoneText}>{selectedZone || 'Select Zone'}</Text>
                {hasMultipleZones && <ChevronDown size={14} color={Colors.primary} style={{ marginLeft: 2 }} />}
              </TouchableOpacity>
              <Text style={styles.countText}> • {locations.length} Devices</Text>
            </View>
          </View>
        </View>

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
            setWebViewReady(true);
          }}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'DIRECTION') {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${data.lat},${data.lng}`;
                Linking.openURL(url);
              }
            } catch(e) {
              console.log('Error parsing webview message:', e);
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

      {/* Zone Picker Modal */}
      <Modal visible={showZonePicker} animationType="fade" transparent>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowZonePicker(false)}>
          <View style={[styles.modalContent, { height: 'auto', paddingBottom: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Zone</Text>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {userZones.map((zoneOption: string) => (
                <TouchableOpacity
                  key={zoneOption}
                  style={styles.zoneItem}
                  onPress={() => {
                    setSelectedZone(zoneOption);
                    setShowZonePicker(false);
                  }}
                >
                  <Text style={[styles.zoneItemText, selectedZone === zoneOption && styles.zoneItemTextSelected]}>
                    {zoneOption}
                  </Text>
                  {selectedZone === zoneOption && <CheckCircle2 size={20} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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
  zoneWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  zoneText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
    fontWeight: '600',
  },
  countText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  zoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  zoneItemText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  zoneItemTextSelected: {
    color: Colors.primary,
    fontWeight: '800',
  },
});
