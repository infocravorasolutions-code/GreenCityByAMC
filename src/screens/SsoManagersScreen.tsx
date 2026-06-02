import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  PermissionsAndroid,
  Linking
} from 'react-native';
import { Search, Plus, Trash2, Edit2, X, Camera, FileText, CheckCircle2, ShieldCheck, ChevronDown, Check, Phone } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../theme/Theme';
import { ssoService } from '../services/ssoService';
import { useAuth } from '../context/AuthContext';

export default function SsoManagersScreen({ navigation }: any) {
  const [managers, setManagers] = useState<any[]>([]);
  const [filteredManagers, setFilteredManagers] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    password: '',
    drivingLicenceNumber: '',
    isActive: true,
    assignedVehicleIds: [] as string[],
  });

  const [drivingLicence, setDrivingLicence] = useState<any>(null);
  
  // Vehicles for Multi-Select
  const [availableVehicles, setAvailableVehicles] = useState<any[]>([]);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [gpsDisabled, setGpsDisabled] = useState(false);

  useEffect(() => {
    fetchManagers();
    fetchVehiclesForCcr();
  }, []);

  const fetchManagers = async () => {
    try {
      const data = await ssoService.getManagers();
      // Currently, the backend does not tag the manager with a 'createdBy' field linking 
      // back to the individual supervisor who made it. It only tags them to the Tenant.
      // Therefore, if we filter on the frontend, newly created managers will disappear.
      // We will display all managers returned by the tenant-scoped backend API.
      setManagers(data);
      handleSearch(search, data);
    } catch (error: any) {
      console.error('[SsoManagersScreen] Failed to fetch managers:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to fetch managers.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchVehiclesForCcr = async () => {
    try {
      const data = await ssoService.getVehiclesForCcr();
      setAvailableVehicles(data);
    } catch (error: any) {
      if (error?.response?.data?.code === 'GPS_DISABLED') {
        // Safe to ignore, GPS is disabled on the tenant.
        console.log('GPS disabled, skipping vehicle fetch.');
        setGpsDisabled(true);
      } else {
        console.error('[SsoManagersScreen] Failed to fetch vehicles:', error);
      }
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchManagers();
    fetchVehiclesForCcr();
  };

  const handleSearch = (text: string, dataToFilter = managers) => {
    setSearch(text);
    if (text) {
      const filtered = dataToFilter.filter(mgr =>
        (mgr.fullName && mgr.fullName.toLowerCase().includes(text.toLowerCase())) ||
        (mgr.phone && mgr.phone.includes(text))
      );
      setFilteredManagers(filtered);
    } else {
      setFilteredManagers(dataToFilter);
    }
  };

  const openAddModal = () => {
    setFormData({
      fullName: '',
      phone: '',
      password: '',
      drivingLicenceNumber: '',
      isActive: true,
      assignedVehicleIds: [],
    });
    setDrivingLicence(null);
    setIsEditing(false);
    setModalVisible(true);
  };

  const openEditModal = (mgr: any) => {
    setCurrentId(mgr._id);
    setFormData({
      fullName: mgr.fullName || mgr.name || '',
      phone: mgr.phone || mgr.mobile || '',
      password: '', // Hidden on edit by default
      drivingLicenceNumber: mgr.drivingLicenceNumber || '',
      isActive: mgr.isActive !== undefined ? mgr.isActive : true,
      assignedVehicleIds: mgr.assignedVehicleIds || [],
    });
    setDrivingLicence(null);
    setIsEditing(true);
    setModalVisible(true);
  };

  const pickImage = async () => {
    const { launchCamera, launchImageLibrary } = require('react-native-image-picker');
    
    Alert.alert(
      'Select Image',
      'Choose from gallery or take a new photo',
      [
        { text: 'Gallery', onPress: () => handleImagePick(launchImageLibrary) },
        { 
          text: 'Camera', 
          onPress: async () => {
            if (Platform.OS === 'android') {
              try {
                const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                  Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
                  return;
                }
              } catch (err) {
                console.warn(err);
                return;
              }
            }
            handleImagePick(launchCamera);
          } 
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleImagePick = async (launcher: any) => {
    try {
      const result = await launcher({
        mediaType: 'photo',
        quality: 0.5,
        maxWidth: 1000,
        maxHeight: 1000,
      });

      if (result.assets && result.assets.length > 0) {
        setDrivingLicence(result.assets[0]);
      }
    } catch (e) {
      console.log('Image Pick Error:', e);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Manager',
      `Are you sure you want to delete ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await ssoService.deleteManager(id);
              fetchManagers();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to delete manager.');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const toggleVehicleAssignment = (vehicleId: string) => {
    if (formData.assignedVehicleIds.includes(vehicleId)) {
      setFormData({
        ...formData,
        assignedVehicleIds: formData.assignedVehicleIds.filter(id => id !== vehicleId)
      });
    } else {
      setFormData({
        ...formData,
        assignedVehicleIds: [...formData.assignedVehicleIds, vehicleId]
      });
    }
  };

  const saveManager = async () => {
    if (!formData.fullName || !formData.phone) {
      Alert.alert('Required Fields', 'Please provide a Name and Mobile number.');
      return;
    }
    
    if (!isEditing && (!formData.password || formData.password.length < 6)) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long.');
      return;
    }

    setSaving(true);
    
    let apiData: any;
    
    // Check if we need to send multipart (if we have a file upload)
    if (drivingLicence) {
      apiData = new FormData();
      apiData.append('fullName', formData.fullName);
      apiData.append('phone', formData.phone);
      if (formData.password) apiData.append('password', formData.password);
      if (formData.drivingLicenceNumber) apiData.append('drivingLicenceNumber', formData.drivingLicenceNumber);
      
      if (isEditing) {
        apiData.append('isActive', formData.isActive ? 'true' : 'false');
      }
      
      formData.assignedVehicleIds.forEach(id => {
        apiData.append('assignedVehicleIds', id);
      });
      
      apiData.append('drivingLicence', {
        uri: drivingLicence.uri,
        type: drivingLicence.type || 'image/jpeg',
        name: drivingLicence.fileName || 'driving_licence.jpg',
      } as any);
    } else {
      // JSON payload
      apiData = {
        fullName: formData.fullName,
        phone: formData.phone,
        drivingLicenceNumber: formData.drivingLicenceNumber,
        assignedVehicleIds: formData.assignedVehicleIds,
      };
      
      if (formData.password) apiData.password = formData.password;
      if (isEditing) apiData.isActive = formData.isActive;
    }

    try {
      if (isEditing) {
        await ssoService.updateManager(currentId, apiData);
      } else {
        await ssoService.createManager(apiData);
      }
      setModalVisible(false);
      fetchManagers();
    } catch (err: any) {
      console.error('[SsoManagersScreen] Save error:', err);
      if (err?.response?.status === 409) {
        Alert.alert('Validation Error', 'This mobile number is already in use.');
      } else {
        Alert.alert('Error', err?.response?.data?.message || 'Failed to save manager.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading && !refreshing && managers.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Area */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.headerTitle}>Managers</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <ShieldCheck size={12} color={Colors.primary} />
              <Text style={{ fontSize: 12, color: Colors.textSecondary, marginLeft: 4, fontWeight: '600' }}>Tenant Administration</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Plus size={16} color={Colors.surface} />
            <Text style={styles.addButtonText}>Add Manager</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>Total Managers: <Text style={{ color: Colors.primary }}>{managers.length}</Text></Text>

        <View style={styles.searchWrapper}>
          <Search size={20} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search managers..."
            value={search}
            onChangeText={(t) => handleSearch(t)}
          />
        </View>
      </View>

      <FlatList
        data={search ? filteredManagers : managers}
        keyExtractor={item => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.tableRow}>
            <View style={styles.cellEmployee}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.fullName ? item.fullName.charAt(0).toUpperCase() : 'M'}</Text>
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.empNameText} numberOfLines={1} ellipsizeMode="tail">{item.fullName || item.name}</Text>
              </View>
            </View>

            <View style={styles.cellBasic}>
              <Text style={styles.cellText}>{item.phone || item.mobile || '-'}</Text>
            </View>

            <View style={styles.cellStatus}>
              <TouchableOpacity 
                style={styles.callButton}
                onPress={() => Linking.openURL(`tel:${item.phone || item.mobile}`)}
              >
                <Phone size={14} color={Colors.surface} />
                <Text style={styles.callButtonText}>Call</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cellActions}>
              <TouchableOpacity style={styles.actionIconButton} onPress={() => openEditModal(item)}>
                <Edit2 size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionIconButton} onPress={() => handleDelete(item._id, item.fullName || item.name)}>
                <Trash2 size={18} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Form Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{isEditing ? 'Edit Manager' : 'Add Manager'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Account Information</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name <Text style={{ color: Colors.error }}>*</Text></Text>
              <TextInput style={styles.input} value={formData.fullName} onChangeText={(t) => setFormData({ ...formData, fullName: t })} placeholder="Ramesh Patel" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobile Number <Text style={{ color: Colors.error }}>*</Text></Text>
              <TextInput style={styles.input} value={formData.phone} onChangeText={(t) => setFormData({ ...formData, phone: t })} placeholder="9876543210" keyboardType="phone-pad" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password {!isEditing && <Text style={{ color: Colors.error }}>*</Text>}</Text>
              <TextInput style={styles.input} value={formData.password} onChangeText={(t) => setFormData({ ...formData, password: t })} placeholder={isEditing ? "Leave blank to keep current" : "Min 6 characters"} secureTextEntry />
            </View>

            {isEditing && (
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setFormData({ ...formData, isActive: !formData.isActive })}
              >
                <View style={[styles.checkbox, formData.isActive && styles.checkboxActive]}>
                  {formData.isActive && <CheckCircle2 size={16} color={Colors.surface} />}
                </View>
                <Text style={styles.checkboxLabel}>Active Status</Text>
              </TouchableOpacity>
            )}

            {!gpsDisabled && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Vehicles Assignment (Tasks)</Text>
                </View>

                {availableVehicles.length > 0 ? (
                  <View style={styles.inputGroup}>
                    <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowVehiclePicker(!showVehiclePicker)}>
                      <Text style={formData.assignedVehicleIds.length > 0 ? styles.dropdownBtnText : styles.dropdownPlaceholder}>
                        {formData.assignedVehicleIds.length > 0 ? `${formData.assignedVehicleIds.length} Vehicle(s) Selected` : 'Select Vehicles...'}
                      </Text>
                      <ChevronDown size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    {showVehiclePicker && (
                      <View style={styles.dropdownMenu}>
                        {availableVehicles.map(vehicle => {
                          const isSelected = formData.assignedVehicleIds.includes(vehicle._id);
                          return (
                            <TouchableOpacity key={vehicle._id} style={styles.dropdownItem} onPress={() => toggleVehicleAssignment(vehicle._id)}>
                              <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                                {vehicle.name} ({vehicle.numberPlate})
                              </Text>
                              {isSelected && <Check size={18} color={Colors.primary} />}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={{ color: Colors.textSecondary, marginBottom: Spacing.md, fontStyle: 'italic' }}>
                    No vehicles available.
                  </Text>
                )}
              </>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Driving Licence</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Driving Licence No</Text>
              <TextInput style={styles.input} value={formData.drivingLicenceNumber} onChangeText={(t) => setFormData({ ...formData, drivingLicenceNumber: t })} placeholder="DL-123456" autoCapitalize="characters" />
            </View>

            <View style={styles.documentRow}>
              <View style={styles.docItem}>
                <Text style={styles.docLabel}>Upload Licence Image</Text>
                <TouchableOpacity style={styles.docPicker} onPress={pickImage}>
                  {drivingLicence ? <CheckCircle2 size={24} color={Colors.success} /> : <Camera size={24} color={Colors.textSecondary} />}
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={saving}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={saveManager} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={Colors.surface} /> : <Text style={styles.saveBtnText}>Save Manager</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    ...Shadows.card,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: Spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: Typography.header,
    fontWeight: '900',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    ...Shadows.button,
  },
  addButtonText: {
    color: Colors.surface,
    fontWeight: '800',
    marginLeft: 6,
    fontSize: 14,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  cellEmployee: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 16,
  },
  empNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  cellBasic: {
    flex: 1.5,
  },
  cellText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  cellStatus: {
    flex: 1,
    alignItems: 'center',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981', // Green color for call
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  callButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.surface,
    marginLeft: 4,
  },
  cellActions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionIconButton: {
    padding: 6,
    marginLeft: 4,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    marginTop: Platform.OS === 'ios' ? 40 : 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.text,
  },
  formScroll: {
    flex: 1,
    padding: Spacing.lg,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: Colors.surface,
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  documentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  docItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 4,
  },
  docLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  docPicker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownBtnText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  dropdownMenu: {
    marginTop: 4,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    overflow: 'hidden',
    ...Shadows.card,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownItemText: {
    fontSize: 15,
    color: Colors.text,
  },
  dropdownItemTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    marginRight: 8,
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontWeight: '700',
    fontSize: 16,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    marginLeft: 8,
    ...Shadows.button,
  },
  saveBtnText: {
    color: Colors.surface,
    fontWeight: '800',
    fontSize: 16,
  },
});
