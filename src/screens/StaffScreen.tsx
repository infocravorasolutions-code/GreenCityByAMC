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
  Image
} from 'react-native';
import { Search, Plus, Trash2, Edit2, X, ChevronDown, Camera, FileText, CheckCircle2, Mic, MicOff, MapPin, Phone } from 'lucide-react-native';
import * as Voice from '@ascendtis/react-native-voice-to-text';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../theme/Theme';
import { managerService } from '../services/managerService';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';

export default function StaffScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<any[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  
  const { user, selectedZone, setSelectedZone } = useAuth();
  const userZones = user?.zones || (user as any)?.supervisorZones || [];
  const [showZonePicker, setShowZonePicker] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState('');
  const [showDesignation, setShowDesignation] = useState(false);
  // Single-page form — no tabs needed
  const [isListening, setIsListening] = useState(false);
  const listeningFieldRef = React.useRef<string | null>(null);
  const [listeningField, setListeningField] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    designation: '',
    category: 'semiSkilled',
    shift: 'shift I',
    phone: '',
    department: '',
    password: '',
    address: '',
    hourlyRate: '',
    uan: '',
    esic: '',
    accountNo: '',
    ifsc: '',
    isActive: true,
    drivingLicenceNumber: '',
  });

  // File States
  const [profilePhoto, setProfilePhoto] = useState<any>(null);
  const [aadhaarFront, setAadhaarFront] = useState<any>(null);
  const [aadhaarBack, setAadhaarBack] = useState<any>(null);
  const [panCard, setPanCard] = useState<any>(null);
  const [drivingLicence, setDrivingLicence] = useState<any>(null);

  useEffect(() => {
    fetchEmployees();
  }, [selectedZone]);

  useEffect(() => {

    console.log('[Voice] Initializing stable module...', Voice);
    
    // Voice results (Final)
    const speechResultsSub = Voice.addEventListener('onSpeechResults', (e: any) => {
      console.log('[Voice Results]', e.value);
      const currentField = listeningFieldRef.current;
      if (e.value && currentField) {
        setFormData(prev => ({ ...prev, [currentField]: e.value }));
        stopListening();
      }
    });

    // Partial results (Real-time typing)
    const partialResultsSub = Voice.addEventListener('onSpeechPartialResults', (e: any) => {
      console.log('[Voice Partial]', e.value);
      const currentField = listeningFieldRef.current;
      if (e.value && currentField) {
        setFormData(prev => ({ ...prev, [currentField]: e.value }));
      }
    });

    const speechErrorSub = Voice.addEventListener('onSpeechError', (e: any) => {
      console.error('[Voice Error]', e);
      stopListening();
    });

    return () => {
      speechResultsSub.remove();
      partialResultsSub.remove();
      speechErrorSub.remove();
      Voice.destroy();
    };
  }, []); // Run once on mount

  // Methods removed as they are now handled inside useEffect listeners or replaced by new API

  const startListening = async (field: string) => {
    console.log(`[Voice] Requesting permission and starting listening for: ${field}`);
    
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'GreenCityAMC needs access to your microphone to help you enter details with your voice.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Microphone permission is required for voice input.');
          return;
        }

        // Check if recognition is available on this device
        const available = await Voice.isRecognitionAvailable();
        if (!available) {
          Alert.alert('Service Not Available', 'Speech recognition is not supported or enabled on this device. Please ensure the Google app is installed and updated.');
          return;
        }
      } catch (err) {
        console.warn(err);
        return;
      }
    }

    try {
      await Voice.setRecognitionLanguage('en-IN');
      listeningFieldRef.current = field;
      setListeningField(field);
      setIsListening(true);
      await Voice.startListening(); 
      console.log('[Voice] Listening started successfully for:', field);
    } catch (e) {
      console.error('[Voice Start Error]', e);
      setIsListening(false);
      listeningFieldRef.current = null;
      setListeningField(null);
      Alert.alert('Voice Error', 'Could not start voice recognition. Please try again.');
    }
  };

  const stopListening = async () => {
    console.log('[Voice] Stopping listening...');
    try {
      await Voice.stopListening();
      setIsListening(false);
      listeningFieldRef.current = null;
      setListeningField(null);
      console.log('[Voice] Listening stopped');
    } catch (e) {
      console.error('[Voice Stop Error]', e);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await managerService.getEmployees();
      let empArray = [];
      if (Array.isArray(data)) empArray = data;
      else if (data && Array.isArray(data.employees)) empArray = data.employees;
      else if (data && data.success && Array.isArray(data.data)) empArray = data.data;

      setEmployees(empArray);
      handleSearch(search, empArray);
    } catch (error) {
      console.error('[StaffScreen] Failed to fetch employees:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEmployees();
  };

  const handleSearch = (text: string, dataToFilter = employees) => {
    setSearch(text);
    if (text) {
      const filtered = dataToFilter.filter(emp =>
        (emp.name && emp.name.toLowerCase().includes(text.toLowerCase()))
      );
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees(dataToFilter);
    }
  };

  const openAddModal = () => {
    setFormData({
      name: '',
      designation: '',
      category: 'semiSkilled',
      shift: 'shift I',
      phone: '',
      department: '',
      password: '',
      address: '',
      hourlyRate: '',
      uan: '',
      esic: '',
      accountNo: '',
      ifsc: '',
      isActive: true,
      drivingLicenceNumber: '',
    });
    setProfilePhoto(null);
    setAadhaarFront(null);
    setAadhaarBack(null);
    setPanCard(null);
    setDrivingLicence(null);
    setIsEditing(false);
    setModalVisible(true);
  };

  const openEditModal = (emp: any) => {
    setCurrentId(emp._id);
    setFormData({
      name: emp.name || '',
      designation: emp.designation || '',
      category: emp.category || 'semiSkilled',
      // Normalize legacy values
      shift: emp.shift === 'shift II' || emp.shift === 'Shift II' || emp.shift === 'night' ? 'shift II' : 'shift I',
      phone: emp.phone || '',
      department: emp.department || '',
      password: '', // Usually not pre-populated
      address: emp.address || '',
      hourlyRate: emp.hourlyRate ? String(emp.hourlyRate) : '',
      uan: emp.uan || '',
      esic: emp.esic || '',
      accountNo: emp.accountNo || '',
      ifsc: emp.ifsc || '',
      isActive: emp.isActive !== undefined ? emp.isActive : true,
      drivingLicenceNumber: emp.drivingLicenceNumber || '',
    });
    setProfilePhoto(null);
    setAadhaarFront(null);
    setAadhaarBack(null);
    setPanCard(null);
    setDrivingLicence(null);
    setIsEditing(true);
    setModalVisible(true);
  };

  const pickImage = async (type: 'profile' | 'aFront' | 'aBack' | 'pan' | 'dl') => {
    const { launchCamera, launchImageLibrary } = require('react-native-image-picker');
    
    Alert.alert(
      'Select Image',
      'Choose from gallery or take a new photo',
      [
        { text: 'Gallery', onPress: () => handleImagePick(launchImageLibrary, type) },
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
            handleImagePick(launchCamera, type);
          } 
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleImagePick = async (launcher: any, type: string) => {
    try {
      const result = await launcher({
        mediaType: 'photo',
        quality: 0.3,      // Compress heavily — prevents 413 errors
        maxWidth: 800,     // Cap resolution
        maxHeight: 800,
      });

      if (result.assets && result.assets.length > 0) {
        const selected = result.assets[0];
        if (type === 'profile') setProfilePhoto(selected);
        else if (type === 'aFront') setAadhaarFront(selected);
        else if (type === 'aBack') setAadhaarBack(selected);
        else if (type === 'pan') setPanCard(selected);
        else if (type === 'dl') setDrivingLicence(selected);
      }
    } catch (e) {
      console.log('Image Pick Error:', e);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Employee',
      `Are you sure you want to delete ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await managerService.deleteEmployee(id);
              fetchEmployees();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to delete employee.');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const saveEmployee = async () => {
    if (!formData.name) {
      Alert.alert('Required Fields', 'Please provide a Name.');
      return;
    }

    setSaving(true);
    const apiData = new FormData();
    Object.keys(formData).forEach(key => {
      const val = (formData as any)[key];
      if (key === 'isActive') {
        apiData.append(key, val ? 'true' : 'false');
      } else if (val !== '' && val !== null && val !== undefined) {
        apiData.append(key, String(val));
      }
    });

    if (profilePhoto) {
      apiData.append('image', {   // API field name is 'image', not 'profileImage'
        uri: profilePhoto.uri,
        type: profilePhoto.type || 'image/jpeg',
        name: profilePhoto.fileName || 'profile.jpg',
      } as any);
    }
    if (aadhaarFront) {
      apiData.append('aadharFront', {   // API uses single-'a': aadharFront
        uri: aadhaarFront.uri,
        type: aadhaarFront.type || 'image/jpeg',
        name: aadhaarFront.fileName || 'aadhar_front.jpg',
      } as any);
    }
    if (aadhaarBack) {
      apiData.append('aadharBack', {   // API uses single-'a': aadharBack
        uri: aadhaarBack.uri,
        type: aadhaarBack.type || 'image/jpeg',
        name: aadhaarBack.fileName || 'aadhar_back.jpg',
      } as any);
    }
    if (panCard) {
      apiData.append('panCard', {
        uri: panCard.uri,
        type: panCard.type || 'image/jpeg',
        name: panCard.fileName || 'pancard.jpg',
      } as any);
    }
    // NOTE: The backend Multer configuration for Employees does not seem to accept
    // the 'drivingLicence' image field yet, causing an "Unexpected field" error.
    // Uncomment this once the backend adds `{ name: 'drivingLicence', maxCount: 1 }`
    /*
    if (drivingLicence) {
      apiData.append('drivingLicence', {
        uri: drivingLicence.uri,
        type: drivingLicence.type || 'image/jpeg',
        name: drivingLicence.fileName || 'driving_licence.jpg',
      } as any);
    }
    */

    try {
      if (isEditing) {
        await managerService.updateEmployee(currentId, apiData);
      } else {
        await managerService.createEmployee(apiData);
      }
      setModalVisible(false);
      fetchEmployees();
    } catch (err: any) {
      console.error('[StaffScreen] Save error:', err);
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save employee.');
    } finally {
      setSaving(false);
    }
  };

  const renderBadge = (text: string, type: 'category' | 'shift') => {
    if (!text) return null;

    let bgColor = Colors.background;
    let textColor = Colors.textSecondary;

    if (type === 'shift') {
      bgColor = '#f3e8ff'; // Light purple
      textColor = Colors.primary;
    } else {
      // Category
      if (text.toLowerCase().includes('semi')) {
        bgColor = '#fef3c7'; // Light amber
        textColor = '#d97706';
      } else if (text.toLowerCase().includes('unskilled')) {
        bgColor = '#f1f5f9'; // Ligh slate
        textColor = '#64748b';
      } else {
        bgColor = '#e0f2fe'; // Light blue
        textColor = '#0369a1';
      }
    }

    return (
      <View style={[styles.badge, { backgroundColor: bgColor }]}>
        <Text style={[styles.badgeText, { color: textColor }]}>
          {text.charAt(0).toUpperCase() + text.slice(1)}
        </Text>
      </View>
    );
  };

  if (loading && !refreshing && employees.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const getImageUrl = (url: string | null | undefined) => {
    if (!url || typeof url !== 'string' || url.trim() === '' || url === 'null') return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/static/')) return `https://api.greencityamc.com${url}`;
    if (url.startsWith('/')) return `https://api.greencityamc.com/static${url}`;
    return `https://api.greencityamc.com/static/${url}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Area */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.headerTitle}>{t('staff.myStaff')}</Text>
            {user?.role === 'supervisor' && userZones.length > 1 ? (
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }} onPress={() => setShowZonePicker(true)}>
                <MapPin size={12} color={Colors.primary} />
                <Text style={{ fontSize: 12, color: Colors.textSecondary, marginLeft: 4, fontWeight: '600' }}>{selectedZone || t('attendance.selectZone')}</Text>
                <ChevronDown size={14} color={Colors.primary} style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            ) : user?.role === 'supervisor' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <MapPin size={12} color={Colors.primary} />
                <Text style={{ fontSize: 12, color: Colors.textSecondary, marginLeft: 4, fontWeight: '600' }}>{user?.zoneLabel || user?.zone || 'Ward'}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Plus size={16} color={Colors.surface} />
            <Text style={styles.addButtonText}>Add Employee</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>{t('reports.total')}: <Text style={{ color: Colors.error }}>{employees.length}</Text></Text>

        <View style={styles.searchWrapper}>
          <Search size={20} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('staff.search')}
            value={search}
            onChangeText={(t) => handleSearch(t)}
          />
        </View>
      </View>

      <FlatList
        data={search ? filteredEmployees : employees}
        keyExtractor={item => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.tableRow}>
            {/* Employee Profile */}
            <View style={styles.cellEmployee}>
              <View style={styles.avatar}>
                {getImageUrl(item.profileImage || item.image) ? (
                  <Image 
                    source={{ uri: getImageUrl(item.profileImage || item.image)! }} 
                    style={{ width: 40, height: 40, borderRadius: 20 }} 
                  />
                ) : (
                  <Text style={styles.avatarText}>{item.name ? item.name.charAt(0).toUpperCase() : 'U'}</Text>
                )}
              </View>
              <View>
                <Text style={styles.empNameText}>{item.name}</Text>
              </View>
            </View>

            {/* Designation */}
            <View style={styles.cellBasic}>
              <Text style={styles.cellText}>{item.designation || '-'}</Text>
            </View>

            {/* Badges and details in a scrollable block to mirror table behavior on small screens */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollableCells}>
              {item.category ? (
                <View style={styles.cellScroll}>
                  {renderBadge(item.category, 'category')}
                </View>
              ) : null}
              
              {item.phone ? (
                <View style={[styles.cellScroll, { flexDirection: 'row', alignItems: 'center' }]}>
                  <Phone size={14} color={Colors.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={styles.cellText}>{item.phone}</Text>
                </View>
              ) : null}
              
              {item.shift ? (
                <View style={styles.cellScroll}>
                  {renderBadge(item.shift, 'shift')}
                </View>
              ) : null}
            </ScrollView>

            {/* Actions */}
            <View style={styles.cellActions}>
              <TouchableOpacity style={styles.actionIconButton} onPress={() => openEditModal(item)}>
                <Edit2 size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionIconButton} onPress={() => handleDelete(item._id, item.name)}>
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
            <Text style={styles.modalTitle}>{isEditing ? 'Edit Employee' : 'Add Employee'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>

            {/* ── SECTION 1: Basic Info ── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Basic Info</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name <Text style={{ color: Colors.error }}>*</Text></Text>
              <View style={styles.inputWithIcon}>
                <TextInput style={[styles.input, { flex: 1 }]} value={formData.name} onChangeText={(t) => setFormData({ ...formData, name: t })} placeholder="John Doe" />
                <TouchableOpacity
                  style={[styles.micBtn, listeningField === 'name' && styles.micBtnActive]}
                  onPress={() => listeningField === 'name' ? stopListening() : startListening('name')}
                >
                  {listeningField === 'name' ? <MicOff size={20} color={Colors.error} /> : <Mic size={20} color={Colors.primary} />}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password <Text style={{ color: Colors.error }}>*</Text></Text>
              <TextInput style={styles.input} value={formData.password} onChangeText={(t) => setFormData({ ...formData, password: t })} placeholder="Min 6 characters" secureTextEntry />
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.sm }]}>
                <Text style={styles.label}>Mobile <Text style={{ color: Colors.error }}>*</Text></Text>
                <TextInput style={styles.input} value={formData.phone} onChangeText={(t) => setFormData({ ...formData, phone: t })} placeholder="1234567890" keyboardType="phone-pad" />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: Spacing.sm }]}>
                <Text style={styles.label}>Driving Licence No</Text>
                <TextInput style={styles.input} value={formData.drivingLicenceNumber} onChangeText={(t) => setFormData({ ...formData, drivingLicenceNumber: t })} placeholder="GJ0120230000000" autoCapitalize="characters" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address <Text style={{ color: Colors.error }}>*</Text></Text>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={[styles.input, { flex: 1, height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                  value={formData.address}
                  onChangeText={(t) => setFormData({ ...formData, address: t })}
                  placeholder="Enter complete address..."
                  multiline
                />
                <TouchableOpacity
                  style={[styles.micBtn, { alignSelf: 'flex-start', marginTop: 10 }, listeningField === 'address' && styles.micBtnActive]}
                  onPress={() => listeningField === 'address' ? stopListening() : startListening('address')}
                >
                  {listeningField === 'address' ? <MicOff size={20} color={Colors.error} /> : <Mic size={20} color={Colors.primary} />}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setFormData({ ...formData, isActive: !formData.isActive })}
            >
              <View style={[styles.checkbox, formData.isActive && styles.checkboxActive]}>
                {formData.isActive && <CheckCircle2 size={16} color={Colors.surface} />}
              </View>
              <Text style={styles.checkboxLabel}>Active Status</Text>
            </TouchableOpacity>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Profile Photo</Text>
            </View>
            <View style={styles.photoUploadRow}>
              <TouchableOpacity style={styles.photoPicker} onPress={() => pickImage('profile')}>
                {profilePhoto ? (
                  <View style={styles.photoPreviewContainer}>
                    <Text style={styles.photoPreviewText}>Photo Selected ✓</Text>
                    <CheckCircle2 size={24} color={Colors.success} />
                  </View>
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Camera size={32} color={Colors.textSecondary} />
                    <Text style={styles.photoPlaceholderText}>Upload Profile Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* ── SECTION 2: Work Details ── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Work Details</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category <Text style={{ color: Colors.error }}>*</Text></Text>
              <View style={styles.radioGroup}>
                {['skilled', 'semiSkilled', 'unSkilled'].map(c => (
                  <TouchableOpacity key={c} onPress={() => setFormData({ ...formData, category: c })} style={[styles.radioBtn, formData.category === c && styles.radioBtnActive]}>
                    <Text style={[styles.radioText, formData.category === c && styles.radioTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Designation <Text style={{ color: Colors.error }}>*</Text></Text>
              <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowDesignation(!showDesignation)}>
                <Text style={formData.designation ? styles.dropdownBtnText : styles.dropdownPlaceholder}>
                  {formData.designation || 'Select Designation...'}
                </Text>
                <ChevronDown size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
              {showDesignation && (
                <View style={styles.dropdownMenu}>
                  {(user?.tenant?.enableGpsTracking 
                    ? ['GL', 'TL', 'supervisor', 'driver', 'mali'] 
                    : ['GL', 'supervisor', 'mali']
                  ).map(d => (
                    <TouchableOpacity key={d} style={styles.dropdownItem} onPress={() => { setFormData({ ...formData, designation: d }); setShowDesignation(false); }}>
                      <Text style={[styles.dropdownItemText, formData.designation === d && styles.dropdownItemTextActive]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.sm }]}>
                <Text style={styles.label}>Department</Text>
                <TextInput style={styles.input} value={formData.department} onChangeText={(t) => setFormData({ ...formData, department: t })} placeholder="Administration" />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: Spacing.sm }]}>
                <Text style={styles.label}>Hourly Rate (₹)</Text>
                <TextInput style={styles.input} value={formData.hourlyRate} onChangeText={(t) => setFormData({ ...formData, hourlyRate: t })} placeholder="0.00" keyboardType="numeric" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Shift</Text>
              <View style={styles.radioGroup}>
                {['shift I', 'shift II'].map(s => (
                  <TouchableOpacity key={s} onPress={() => setFormData({ ...formData, shift: s })} style={[styles.radioBtn, formData.shift === s && styles.radioBtnActive]}>
                    <Text style={[styles.radioText, formData.shift === s && styles.radioTextActive]}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── SECTION 3: Bank & Documents ── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Bank & IDs</Text>
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.sm }]}>
                <Text style={styles.label}>UAN</Text>
                <TextInput style={styles.input} value={formData.uan} onChangeText={(t) => setFormData({ ...formData, uan: t })} placeholder="Universal Account No" />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: Spacing.sm }]}>
                <Text style={styles.label}>ESIC</Text>
                <TextInput style={styles.input} value={formData.esic} onChangeText={(t) => setFormData({ ...formData, esic: t })} placeholder="ESIC No" />
              </View>
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.sm }]}>
                <Text style={styles.label}>Account No</Text>
                <TextInput style={styles.input} value={formData.accountNo} onChangeText={(t) => setFormData({ ...formData, accountNo: t })} placeholder="Bank Account Number" keyboardType="numeric" />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: Spacing.sm }]}>
                <Text style={styles.label}>IFSC</Text>
                <TextInput style={styles.input} value={formData.ifsc} onChangeText={(t) => setFormData({ ...formData, ifsc: t })} placeholder="Bank IFSC Code" autoCapitalize="characters" />
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Documents</Text>
            </View>
            <View style={styles.documentRow}>
              <View style={styles.docItem}>
                <Text style={styles.docLabel}>Aadhaar Front</Text>
                <TouchableOpacity style={styles.docPicker} onPress={() => pickImage('aFront')}>
                  {aadhaarFront ? <CheckCircle2 size={24} color={Colors.success} /> : <FileText size={24} color={Colors.textSecondary} />}
                </TouchableOpacity>
              </View>
              <View style={styles.docItem}>
                <Text style={styles.docLabel}>Aadhaar Back</Text>
                <TouchableOpacity style={styles.docPicker} onPress={() => pickImage('aBack')}>
                  {aadhaarBack ? <CheckCircle2 size={24} color={Colors.success} /> : <FileText size={24} color={Colors.textSecondary} />}
                </TouchableOpacity>
              </View>
              <View style={styles.docItem}>
                <Text style={styles.docLabel}>PAN Card</Text>
                <TouchableOpacity style={styles.docPicker} onPress={() => pickImage('pan')}>
                  {panCard ? <CheckCircle2 size={24} color={Colors.success} /> : <FileText size={24} color={Colors.textSecondary} />}
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.documentRow}>
              <View style={styles.docItem}>
                <Text style={styles.docLabel}>Driving Licence</Text>
                <TouchableOpacity style={styles.docPicker} onPress={() => pickImage('dl')}>
                  {drivingLicence ? <CheckCircle2 size={24} color={Colors.success} /> : <FileText size={24} color={Colors.textSecondary} />}
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={saving}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={saveEmployee} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={Colors.surface} /> : <Text style={styles.saveBtnText}>Save Employee</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
    borderBottomWidth: 1,
    borderColor: Colors.border,
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
    marginBottom: Spacing.md,
  },
  addButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  addButtonText: {
    color: Colors.surface,
    fontWeight: '700',
    marginLeft: 6,
    fontSize: 14,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  listContent: {
    paddingBottom: 40,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  tableRow: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.soft,
  },
  cellEmployee: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    color: Colors.surface,
    fontWeight: '800',
    fontSize: 16,
  },
  empNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  empCodeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cellBasic: {
    marginBottom: Spacing.md,
  },
  cellText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  scrollableCells: {
    alignItems: 'center',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  cellScroll: {
    marginRight: Spacing.lg,
    paddingVertical: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cellActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  actionIconButton: {
    padding: 8,
    marginLeft: Spacing.sm,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  formScroll: {
    padding: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  radioGroup: {
    flexDirection: 'row',
  },
  radioBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginRight: Spacing.sm,
    backgroundColor: Colors.background,
  },
  radioBtnActive: {
    backgroundColor: '#f3e8ff',
    borderColor: Colors.primary,
  },
  radioText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  radioTextActive: {
    color: Colors.primary,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background,
  },
  dropdownBtnText: {
    fontSize: 15,
    color: Colors.text,
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  dropdownMenu: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    ...Shadows.soft,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  dropdownItemTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  saveBtn: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
    borderRadius: BorderRadius.md,
    ...Shadows.soft,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.surface,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  micBtn: {
    padding: 10,
    marginLeft: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  micBtnActive: {
    backgroundColor: '#fee2e2',
    borderColor: Colors.error,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.primary,
  },
  sectionHeader: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
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
  },
  checkboxActive: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  photoUploadRow: {
    marginBottom: Spacing.xl,
  },
  photoPicker: {
    height: 120,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  photoPlaceholderText: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  photoPreviewContainer: {
    alignItems: 'center',
  },
  photoPreviewText: {
    marginBottom: 8,
    fontSize: 14,
    color: Colors.success,
    fontWeight: '700',
  },
  documentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  docItem: {
    flex: 1,
    alignItems: 'center',
  },
  docLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  docPicker: {
    width: 60,
    height: 60,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
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
