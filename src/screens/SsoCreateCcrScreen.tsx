import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  useWindowDimensions,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Geolocation from '@react-native-community/geolocation';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import {
  ChevronLeft,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Truck,
  Type,
  AlignLeft,
  Flag,
  Camera,
  Image as ImageIcon,
  MapPin,
  X
} from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../theme/Theme';
import { ssoService } from '../services/ssoService';

export default function SsoCreateCcrScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const [form, setForm] = useState({
    type: 'Task Request',
    title: '',
    description: '',
    priority: 'Medium',
    vehicleId: '',
    location: null as any,
  });
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [selectedVehicleName, setSelectedVehicleName] = useState('');

  useEffect(() => {
    fetchVehicles();
    requestLocation();
  }, []);

  const fetchVehicles = async () => {
    try {
      const data = await ssoService.getVehicles();
      setVehicles(data);
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
    }
  };

  const requestLocation = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('[CreateCCR] Location permission denied');
          return;
        }
      } catch (err) {
        console.warn('[CreateCCR] Permission check error:', err);
        return;
      }
    }

    Geolocation.getCurrentPosition(
      (position) => {
        setForm(prev => ({
          ...prev,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }
        }));
      },
      (error) => {
        console.log('[CreateCCR] High accuracy location failed, trying low accuracy...', error.message);
        Geolocation.getCurrentPosition(
          (pos) => {
            setForm(prev => ({
              ...prev,
              location: {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              }
            }));
          },
          (err) => console.log('[CreateCCR] Location fallback error:', err.message),
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );
  };



  const handleSubmit = async () => {
    if (!form.title || !form.description) {
      Alert.alert('Missing Info', 'Please provide a title and description for the ticket.');
      return;
    }

    setLoading(true);
    try {
      if (!form.vehicleId) {
        Alert.alert('Vehicle Required', 'Please select a vehicle to associate with this ticket.');
        setLoading(false);
        return;
      }

      let mappedType = 'task';
      if (form.type === 'Complaint') mappedType = 'complaint';
      if (form.type === 'Maintenance') mappedType = 'maintenance';

      const payload = {
        ...form,
        type: mappedType,
        priority: form.priority.toLowerCase(),
      };

      console.log('[Create CCR] Sending Payload:', JSON.stringify(payload, null, 2));

      await ssoService.createTicket(payload);

      Alert.alert('Success', 'Safety ticket created successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('[Create CCR] Error:', error.response?.data || error.message);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create ticket.');
    } finally {
      setLoading(false);
    }
  };

  const types = ['Task Request', 'Complaint', 'Maintenance'];
  const priorities = ['Low', 'Medium', 'High'];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Safety Ticket</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.inputGroup}>
          <Text style={styles.webLabel}>TYPE</Text>
          <TouchableOpacity
            style={styles.webDropdown}
            onPress={() => setShowTypePicker(true)}
          >
            <Text style={styles.webDropdownText}>{form.type}</Text>
            <ChevronDown size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.webLabel}>PRIORITY</Text>
          <TouchableOpacity
            style={styles.webDropdown}
            onPress={() => setShowPriorityPicker(true)}
          >
            <Text style={styles.webDropdownText}>{form.priority}</Text>
            <ChevronDown size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.webLabel}>TITLE</Text>
          <TextInput
            style={styles.webInput}
            placeholder="Ticket title"
            placeholderTextColor={Colors.textSecondary}
            value={form.title}
            onChangeText={(v) => setForm({ ...form, title: v })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.webLabel}>DETAILS</Text>
          <TextInput
            style={[styles.webInput, styles.webTextArea]}
            placeholder="Explain the requirement..."
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={4}
            value={form.description}
            onChangeText={(v) => setForm({ ...form, description: v })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.webLabel}>ASSIGN TO VEHICLE</Text>
          <TouchableOpacity
            style={styles.webDropdown}
            onPress={() => setShowVehiclePicker(true)}
          >
            <Text style={selectedVehicleName ? styles.webDropdownText : styles.pickerText}>
              {selectedVehicleName || 'Select Vehicle'}
            </Text>
            <ChevronDown size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.zoneHintText}>Only showing vehicles in your assigned zone.</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.surface} />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Create</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showVehiclePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Vehicle</Text>
              <TouchableOpacity onPress={() => setShowVehiclePicker(false)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={[{ _id: '', name: 'None / General' }, ...vehicles]}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.vehicleItem}
                  onPress={() => {
                    setForm({ ...form, vehicleId: item._id });
                    setSelectedVehicleName(item.name);
                    setShowVehiclePicker(false);
                  }}
                >
                  <Text style={styles.vehicleItemText}>{item.name}</Text>
                  {form.vehicleId === item._id && <CheckCircle size={18} color={Colors.primary} />}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showTypePicker} animationType="fade" transparent>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowTypePicker(false)}>
          <View style={[styles.modalContent, { height: 'auto', paddingBottom: 20 }]}>
            {types.map((t) => (
              <TouchableOpacity
                key={t}
                style={styles.vehicleItem}
                onPress={() => {
                  setForm({ ...form, type: t });
                  setShowTypePicker(false);
                }}
              >
                <Text style={styles.vehicleItemText}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showPriorityPicker} animationType="fade" transparent>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowPriorityPicker(false)}>
          <View style={[styles.modalContent, { height: 'auto', paddingBottom: 20 }]}>
            {priorities.map((p) => (
              <TouchableOpacity
                key={p}
                style={styles.vehicleItem}
                onPress={() => {
                  setForm({ ...form, priority: p });
                  setShowPriorityPicker(false);
                }}
              >
                <Text style={styles.vehicleItemText}>{p}</Text>
              </TouchableOpacity>
            ))}
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  formSection: {
    marginBottom: Spacing.xl,
  },
  webLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6b7280', // Slate-500
    letterSpacing: 1,
    marginBottom: 8,
  },
  webDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb', // Gray-50
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 54,
  },
  webDropdownText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '700',
  },
  webInput: {
    backgroundColor: '#f9fafb', // Gray-50
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 54,
    fontSize: 15,
    color: Colors.text,
    fontWeight: '600',
  },
  webTextArea: {
    height: 120,
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  zoneHintText: {
    fontSize: 11,
    color: '#9ca3af', // Gray-400
    marginTop: 6,
    marginLeft: 4,
  },
  pickerText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    ...Shadows.button,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: Colors.surface,
    fontSize: 18,
    fontWeight: '800',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    padding: 12,
    borderRadius: 10,
    marginBottom: Spacing.xl,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '700',
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
    height: '70%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  closeText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  vehicleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  vehicleItemText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 20,
  },
});
