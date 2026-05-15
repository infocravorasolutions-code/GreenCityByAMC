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
    type: 'Task',
    title: '',
    description: '',
    priority: 'medium',
    vehicleId: '',
    location: null as any,
    image: null as any,
  });
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [selectedVehicleName, setSelectedVehicleName] = useState('Select Vehicle (Optional)');

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

  const requestLocation = () => {
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
      (error) => console.error('Location error:', error),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const handleImagePicker = () => {
    Alert.alert(
      'Attach Photo',
      'Choose an option to attach a photo to this ticket.',
      [
        {
          text: 'Camera',
          onPress: () => launchCamera({ mediaType: 'photo', quality: 0.7 }, (res) => {
            if (res.assets?.[0]) setForm(prev => ({ ...prev, image: res.assets![0] }));
          })
        },
        {
          text: 'Gallery',
          onPress: () => launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, (res) => {
            if (res.assets?.[0]) setForm(prev => ({ ...prev, image: res.assets![0] }));
          })
        },
        { text: 'Cancel', style: 'cancel' }
      ]
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

      const payload = {
        ...form,
        type: form.type.toLowerCase() === 'complaint' ? 'complaint' : 'task'
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

  const types = ['Task', 'Complaint', 'Maintenance', 'Safety Violation', 'Accident'];
  const priorities = [
    { label: 'Low', value: 'low', color: '#3b82f6' },
    { label: 'Medium', value: 'medium', color: '#f59e0b' },
    { label: 'High', value: 'high', color: '#ef4444' }
  ];

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
        <View style={styles.formSection}>
          <Text style={styles.label}>Ticket Type</Text>
          <View style={styles.typeGrid}>
            {types.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeBadge, form.type === t && styles.typeBadgeActive]}
                onPress={() => setForm({ ...form, type: t })}
              >
                <Text style={[styles.typeText, form.type === t && styles.typeTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelWrapper}>
            <Type size={16} color={Colors.textSecondary} />
            <Text style={styles.inputLabel}>Title</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="e.g., Brake Issue in Truck"
            placeholderTextColor={Colors.textSecondary}
            value={form.title}
            onChangeText={(v) => setForm({ ...form, title: v })}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelWrapper}>
            <AlignLeft size={16} color={Colors.textSecondary} />
            <Text style={styles.inputLabel}>Description</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the issue in detail..."
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={4}
            value={form.description}
            onChangeText={(v) => setForm({ ...form, description: v })}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelWrapper}>
            <Truck size={16} color={Colors.textSecondary} />
            <Text style={styles.inputLabel}>Vehicle (Optional)</Text>
          </View>
          <TouchableOpacity
            style={styles.pickerTrigger}
            onPress={() => setShowVehiclePicker(true)}
          >
            <Text style={[styles.pickerText, form.vehicleId ? styles.pickerTextSelected : null]}>
              {selectedVehicleName}
            </Text>
            <ChevronDown size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* New Attachment Section */}
        <View style={styles.inputGroup}>
          <View style={styles.labelWrapper}>
            <Camera size={16} color={Colors.textSecondary} />
            <Text style={styles.inputLabel}>Attachments</Text>
          </View>
          <TouchableOpacity
            style={styles.attachmentButton}
            onPress={handleImagePicker}
          >
            {form.image ? (
              <View style={styles.imagePreview}>
                <ImageIcon size={20} color={Colors.primary} />
                <Text style={styles.imageName} numberOfLines={1}>{form.image.fileName}</Text>
                <TouchableOpacity onPress={() => setForm(prev => ({ ...prev, image: null }))}>
                  <X size={16} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.attachmentText}>Click to add photo</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Location Display */}
        {/* {form.location && (
          <View style={styles.locationContainer}>
            <MapPin size={16} color={Colors.primary} />
            <Text style={styles.locationText}>
              Location tagged: {form.location.latitude.toFixed(4)}, {form.location.longitude.toFixed(4)}
            </Text>
          </View>
        )} */}

        <View style={styles.formSection}>
          <View style={styles.labelWrapper}>
            <Flag size={16} color={Colors.textSecondary} />
            <Text style={styles.inputLabel}>Priority Level</Text>
          </View>
          <View style={[styles.priorityGrid, width > 600 && styles.priorityGridWide]}>
            {priorities.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.priorityButton,
                  form.priority === p.value && { backgroundColor: p.color, borderColor: p.color },
                  width > 600 && { maxWidth: 200 }
                ]}
                onPress={() => setForm({ ...form, priority: p.value as any })}
              >
                <Text style={[styles.priorityButtonText, form.priority === p.value && styles.priorityButtonTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
              <CheckCircle size={20} color={Colors.surface} style={{ marginRight: 10 }} />
              <Text style={styles.submitButtonText}>Create Ticket</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Vehicle Picker Modal */}
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
                  <Truck size={18} color={Colors.textSecondary} style={{ marginRight: 12 }} />
                  <Text style={styles.vehicleItemText}>{item.name}</Text>
                  {form.vehicleId === item._id && <CheckCircle size={18} color={Colors.primary} />}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </View>
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
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeBadgeActive: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  typeText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  typeTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  inputGroup: {
    marginBottom: Spacing.xl,
  },
  labelWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 54,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    height: 120,
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 54,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  pickerTextSelected: {
    color: Colors.text,
    fontWeight: '600',
  },
  priorityGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  priorityGridWide: {
    justifyContent: 'flex-start',
  },
  priorityButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  priorityButtonTextActive: {
    color: Colors.surface,
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
  attachmentButton: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  imagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    width: '100%',
  },
  imageName: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
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
