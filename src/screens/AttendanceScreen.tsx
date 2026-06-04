import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid,
  RefreshControl,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  Camera as CameraIcon,
  X,
  RefreshCw,
  LogOut,
  LogIn,
  Check,
  CheckCircle2,
  MapPin,
  ChevronDown,
  Users
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  FadeIn,
  FadeOut,
  ScaleInCenter,
  ZoomIn
} from 'react-native-reanimated';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../theme/Theme';
import { managerService } from '../services/managerService';
import { attendanceService } from '../services/attendanceService';
import Geolocation from '@react-native-community/geolocation';
import { launchCamera } from 'react-native-image-picker';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';

const Avatar = ({ item }: { item: any }) => {
  const [imgError, setImgError] = useState(false);
  const rawUrl = item.profileImage || item.image || item.photo;
  
  const getImageUrl = (url: string | null | undefined) => {
    if (!url || typeof url !== 'string' || url.trim() === '' || url === 'null') return null;
    if (url.startsWith('http')) return url;
    
    // FIX: The backend serves uploaded files from the /static/ directory
    if (url.startsWith('/static/')) return `https://api.greencityamc.com${url}`;
    if (url.startsWith('/')) return `https://api.greencityamc.com/static${url}`;
    return `https://api.greencityamc.com/static/${url}`;
  };
  const finalUrl = getImageUrl(rawUrl);
  return (
    <View style={[styles.photoSmall, { backgroundColor: '#0056D215', overflow: 'hidden', padding: 0 }]}>
      {finalUrl && !imgError ? (
        <Image 
          source={{ uri: finalUrl }} 
          style={{ width: '100%', height: '100%', resizeMode: 'cover' }} 
          onError={(e) => {
            // Added error logging so we can catch 404s in the console
            console.log('Image load error for:', finalUrl, e.nativeEvent.error);
            setImgError(true);
          }}
        />
      ) : (
        <Text style={styles.initialSmall}>
          {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
        </Text>
      )}
    </View>
  );
};

export default function AttendanceScreen() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { user, selectedZone, setSelectedZone } = useAuth();
  const userZones = user?.zones || (user as any)?.supervisorZones || [];
  const [showZonePicker, setShowZonePicker] = useState(false);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Form & Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  // Payload State
  const [photo, setPhoto] = useState<any>(null);
  const [rawCoords, setRawCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [locationText, setLocationText] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    fetchEmployees();
    // Fetch GPS once when screen loads, just like the employee side!
    fetchGPSAsync();
  }, [selectedZone]);

  const getISTDateStr = (d: Date) => {
    // IST is UTC + 5:30
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(d.getTime() + istOffsetMs);
    return istDate.toISOString().split('T')[0];
  };

  const fetchEmployees = async () => {
    try {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const todayStr = getISTDateStr(now);
      const yesterdayStr = getISTDateStr(yesterday);

      // Fetch both Lists in parallel for perfect sync
      const [empResponse, attendanceResponse] = await Promise.all([
        managerService.getEmployees(),
        managerService.getStats(yesterdayStr, todayStr)
      ]);

      // Normalize Employee Data
      let empArray = [];
      if (Array.isArray(empResponse)) empArray = empResponse;
      else if (empResponse && Array.isArray(empResponse.employees)) empArray = empResponse.employees;
      else if (empResponse && empResponse.success && Array.isArray(empResponse.data)) empArray = empResponse.data;

      // Normalize Attendance Data
      let attendanceRecords = [];
      if (Array.isArray(attendanceResponse)) {
        attendanceRecords = attendanceResponse;
      } else if (attendanceResponse && Array.isArray(attendanceResponse.attendance)) {
        // The API returns the array inside the 'attendance' singular key!
        attendanceRecords = attendanceResponse.attendance;
      } else if (attendanceResponse && Array.isArray(attendanceResponse.attendances)) {
        attendanceRecords = attendanceResponse.attendances;
      } else if (attendanceResponse && attendanceResponse.success && Array.isArray(attendanceResponse.data)) {
        attendanceRecords = attendanceResponse.data;
      }

      // Merge: Update employee working status based on actual live logs
      const attendanceMap = new Map();
      attendanceRecords.forEach((r: any) => {
        const empId = r.employeeId?._id || r.employeeId;
        if (!attendanceMap.has(empId)) {
          attendanceMap.set(empId, []);
        }
        attendanceMap.get(empId).push(r);
      });

      const processedEmployees = empArray.map((emp: any) => {
        // Get all records for this employee from Map (O(1) lookup)
        const empRecords = attendanceMap.get(emp._id) || [];

        // Sort them by date descending to get the absolute most recent one. 
        // Sort them by date descending to get the absolute most recent one. 
        empRecords.sort((a: any, b: any) => {
          let timeB = new Date(b.date || b.createdAt || b.shiftFirstStepIn || 0).getTime();
          let timeA = new Date(a.date || a.createdAt || a.shiftFirstStepIn || 0).getTime();
          
          if (isNaN(timeB)) timeB = 0;
          if (isNaN(timeA)) timeA = 0;
          
          return timeB - timeA;
        });

        const latestRecord = empRecords[0];

        if (emp.name?.includes('security') || emp.name?.includes('1')) {
           console.log(`\n--- DEBUG FOR ${emp.name} ---`);
           empRecords.forEach((r: any, idx: number) => {
             console.log(`Record ${idx}: date=${r.date}, createdAt=${r.createdAt}, stepIn=${r.stepIn}, stepOut=${r.stepOut}`);
           });
           console.log(`Chosen latestRecord: stepIn=${latestRecord?.stepIn}, isWorking=${!!latestRecord?.stepIn}`);
        }

        let hasCompletedShift = false; // Allow unlimited step-in/step-out cycles for supervisors too

        return {
          ...emp,
          attendance: latestRecord,
          // Source of truth: The absolute newest attendance record overrides any stale backend flag.
          // Only mark as working if stepIn is present, stepOut is empty, AND the record is from today.
          // (If they forgot to step out yesterday, we don't want them stuck working today).
          isWorking: latestRecord ? (() => {
             const hasStepIn = !!latestRecord.stepIn && latestRecord.stepIn !== 'null';
             const hasStepOut = !!latestRecord.stepOut && latestRecord.stepOut !== 'null';
             const rDateStr = getISTDateStr(new Date(latestRecord.date || latestRecord.createdAt || latestRecord.stepIn || Date.now()));
             
             // If it's today's record, or they started a shift late yesterday that is still active
             return hasStepIn && !hasStepOut && (rDateStr === todayStr || rDateStr === yesterdayStr);
          })() : false,
          hasCompletedShift
        };
      });

      setEmployees(processedEmployees);
      console.log(`[Attendance] Merged ${processedEmployees.length} employees with ${attendanceRecords.length} live logs.`);
      handleSearch(search, processedEmployees);
    } catch (error) {
      console.error('[AttendanceScreen] Failed to fetch employees:', error);
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

  const onSearchChangeText = (text: string) => {
    setSearch(text);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      if (text) {
        const filtered = employees.filter(emp =>
          (emp.name && emp.name.toLowerCase().includes(text.toLowerCase()))
        );
        setFilteredEmployees(filtered);
      } else {
        setFilteredEmployees(employees);
      }
    }, 300);
  };

  const resetForm = () => {
    setSelectedEmployee(null);
    setPhoto(null);
    setNote('');
    setModalVisible(false);
  };

  const initStepAction = (emp: any) => {
    setSelectedEmployee(emp);
    setModalVisible(true);

    // If we don't have location yet (or it failed) AND we aren't currently fetching, try again.
    if (!rawCoords || !locationText) {
      if (!fetchingLocation) {
        fetchGPSAsync();
      }
    }
  };

  const fetchGPSAsync = async () => {
    setFetchingLocation(true);
    setLocationText('Locating automatically...');

    // Request Android Permissions Runtime
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);

        const fineGranted = granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;
        const coarseGranted = granted['android.permission.ACCESS_COARSE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;

        if (!fineGranted && !coarseGranted) {
          setFetchingLocation(false);
          setLocationText('');
          return;
        }
      } catch (err) {
        setFetchingLocation(false);
        setLocationText('');
        return;
      }
    }

    // Forcefully stop loading after 8 seconds in case native GPS API completely hangs
    const fallbackTimeout = setTimeout(() => {
      setFetchingLocation(false);
      setLocationText(prev => prev === 'Locating automatically...' ? '' : prev);
    }, 8000);

    Geolocation.getCurrentPosition(
      async (position) => {
        clearTimeout(fallbackTimeout);
        const { latitude, longitude } = position.coords;
        setRawCoords({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(`https://us1.locationiq.com/v1/reverse?key=pk.26a2af4750035155566642c0210a9d2b&lat=${latitude}&lon=${longitude}&format=json`, {
            headers: {
              'User-Agent': 'GreenCityAMC-AttendanceApp/1.0 (Mobile)',
              'Accept': 'application/json'
            }
          });
          const json = await res.json();
          setLocationText(json.display_name || '');
        } catch (e) {
          setLocationText(''); // Clear it so they can type
        }
        setFetchingLocation(false);
      },
      (error) => {
        clearTimeout(fallbackTimeout);
        console.warn(`[GPS ERROR] ${error.message}`);
        setLocationText(prev => prev === 'Locating automatically...' ? '' : prev); // Failed, let them type
        setFetchingLocation(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5000 }
    );
  };

  const capturePhoto = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission Denied', 'Camera permission is required.');
        return;
      }
    }

    try {
      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'front',
        quality: 0.3,
        maxWidth: 800,
        maxHeight: 800,
      });

      if (result.assets && result.assets.length > 0) {
        setPhoto(result.assets[0]);
      }
    } catch (e) {
      console.log('Camera Error', e);
    }
  };

  const triggerSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      resetForm();
      fetchEmployees();
    }, 2000);
  };

  const handleSubmission = async () => {
    if (!selectedEmployee) return;

    const isSteppingIn = !selectedEmployee.isWorking;

    if (!photo) {
      Alert.alert('Photo Required', 'Please tap the camera box to capture a selfie.');
      return;
    }

    if (!locationText.trim()) {
      Alert.alert('Location Required', 'Please wait for auto-detect or type your location manually.');
      return;
    }

    console.log(`[Attendance] Beginning ${isSteppingIn ? 'Step In' : 'Step Out'} for ${selectedEmployee.name}`);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('employeeId', selectedEmployee._id);
      formData.append('latitude', String(rawCoords?.lat || 0));
      formData.append('longitude', String(rawCoords?.lng || 0));
      formData.append('address', locationText);
      formData.append('shift', selectedEmployee.shift || '');
      formData.append('status', 'present');
      formData.append('note', note || (isSteppingIn ? '' : 'Step out via manager'));

      if (isSteppingIn) {
        formData.append('stepInImage', {
          uri: photo.uri,
          type: photo.type || 'image/jpeg',
          name: photo.fileName || 'photo.jpg',
        } as any);
        await attendanceService.stepIn(formData);
      } else {
        await attendanceService.stepOut({
          employeeId: selectedEmployee._id,
          latitude: rawCoords?.lat || 0,
          longitude: rawCoords?.lng || 0,
          address: locationText,
          shift: selectedEmployee.shift || '',
          status: 'present',
          note: note || 'Step out via manager',
          stepOutImage: ''
        });
      }

      console.log(`[Attendance] Successfully completed ${isSteppingIn ? 'Step In' : 'Step Out'}`);
      triggerSuccess();
      // resetForm and fetchEmployees are now handled inside triggerSuccess after the animation
    } catch (error: any) {
      console.error(`[Attendance] ${isSteppingIn ? 'Step In' : 'Step Out'} FAILED:`, error);
      if (error.response) {
        console.error('- Status:', error.response.status);
        console.error('- Data:', JSON.stringify(error.response.data));
      }
      Alert.alert('ERROR', error?.response?.data?.message || 'Could not save attendance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !refreshing && employees.length === 0) {
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
            <Text style={styles.headerTitle}>{t('attendance.stepInOut')}</Text>
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
        </View>
      </View>

      <View style={styles.searchSection}>
        <Text style={styles.instruction}>{t('attendance.selectEmployee')}</Text>
        <View style={styles.searchWrapper}>
          <Search size={24} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('attendance.searchPlaceholder')}
            value={search}
            onChangeText={onSearchChangeText}
          />
        </View>

        <FlatList
          data={search ? filteredEmployees : employees}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 20 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Users size={40} color="#94a3b8" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 8 }}>No Employees Found</Text>
              <Text style={{ fontSize: 14, color: Colors.textSecondary, textAlign: 'center' }}>No employees found matching your criteria.</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.employeeItem}
              onPress={() => {
                initStepAction(item);
              }}
              activeOpacity={0.7}
            >
              <Avatar item={item} />
              <View style={{ flex: 1 }}>
                <Text style={styles.employeeName}>{item.name}</Text>
              </View>
              {/* Prioritize active attendance record over isWorking flag if available */}
              {item.isWorking ? (
                <View style={styles.stepOutAction}>
                  <Text style={styles.stepActionText}>STEP OUT</Text>
                </View>
              ) : (
                <View style={styles.stepInAction}>
                  <Text style={styles.stepActionText}>
                    {t('attendance.stepInBtn')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Web-Parity Action Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={resetForm}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            {showSuccess ? (
              <Animated.View
                entering={FadeIn}
                style={styles.modalSuccessContent}
              >
                <Animated.View
                  entering={ZoomIn.duration(400)}
                  style={styles.successCircle}
                >
                  <Check size={50} color={Colors.surface} strokeWidth={3} />
                </Animated.View>
                <Text style={styles.successText}>Success!</Text>
              </Animated.View>
            ) : (
              <>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>
                      {selectedEmployee?.isWorking ? t('attendance.stepOutBtn') : t('attendance.stepInBtn')} - {selectedEmployee?.name}
                    </Text>
                    <Text style={styles.modalSubtitle}>{t('attendance.photoInstruction')}</Text>
                  </View>
                  <TouchableOpacity onPress={resetForm} style={styles.closeBtn}>
                    <X size={24} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
                  {/* Massive Camera Viewfinder Block */}
                  <TouchableOpacity
                    style={styles.viewfinder}
                    onPress={capturePhoto}
                    activeOpacity={0.8}
                  >
                    {photo ? (
                      <View style={styles.imageContainer}>
                        <Image source={{ uri: photo.uri }} style={styles.capturedImage} />
                        {/* Retake Overlay */}
                        <View style={styles.retakeOverlay}>
                          <View style={styles.retakeIconCircle}>
                            <RefreshCw size={24} color={Colors.surface} />
                          </View>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.emptyCamera}>
                        <CameraIcon size={48} color={Colors.textSecondary} />
                        <Text style={styles.emptyCameraText}>{t('attendance.takingPhoto')}</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Form Fields */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Location</Text>
                    <View style={styles.locationInputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter location manually..."
                        value={locationText}
                        onChangeText={setLocationText}
                      />
                      {fetchingLocation && (
                        <ActivityIndicator size="small" color={Colors.primary} style={styles.locationLoader} />
                      )}
                    </View>
                  </View>

                  <View style={[styles.inputGroup, { marginBottom: Spacing.xl }]}>
                    <Text style={styles.label}>Note (Optional)</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Add any notes..."
                      multiline
                      value={note}
                      onChangeText={setNote}
                    />
                  </View>

                  {/* Organic Action Button */}
                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      selectedEmployee?.isWorking ? styles.outBtnColor : styles.inBtnColor,
                      submitting && { opacity: 0.5 }
                    ]}
                    onPress={handleSubmission}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color={Colors.surface} />
                    ) : (
                      <View style={styles.submitBtnContent}>
                        {selectedEmployee?.isWorking ? (
                          <LogOut size={20} color={Colors.surface} />
                        ) : (
                          <LogIn size={20} color={Colors.surface} />
                        )}
                        <Text style={styles.submitBtnText}>
                          {selectedEmployee?.isWorking ? t('attendance.stepOutBtn') : t('attendance.stepInBtn')}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Zone Picker Modal */}
      <Modal visible={showZonePicker} animationType="fade" transparent>
        <TouchableOpacity style={styles.zonePickerOverlay} onPress={() => setShowZonePicker(false)}>
          <View style={[styles.zonePickerContent, { height: 'auto', paddingBottom: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('attendance.selectZone')}</Text>
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
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSection: {
    flex: 1,
    padding: Spacing.md,
  },
  instruction: {
    fontSize: Typography.header,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginVertical: Spacing.md,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.body,
    color: Colors.text,
  },
  listContent: {
    paddingBottom: 20,
  },
  employeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 10,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  photoSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  initialSmall: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  employeeName: {
    fontSize: Typography.body,
    fontWeight: '700',
    color: Colors.text,
  },
  employeeCode: {
    fontSize: Typography.small,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  stepInAction: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
  },
  stepOutAction: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
  },
  stepActionText: {
    color: Colors.surface,
    fontWeight: '800',
    fontSize: 12,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  viewfinder: {
    width: '100%',
    height: 220,
    backgroundColor: '#f1f5f9',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
  },
  capturedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  retakeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retakeIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCamera: {
    alignItems: 'center',
  },
  emptyCameraText: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  locationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 50,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  locationLoader: {
    position: 'absolute',
    right: Spacing.md,
  },
  textArea: {
    height: 80,
    paddingTop: Spacing.sm,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  pillBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    marginRight: Spacing.sm,
  },
  pillBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: '#f3e8ff',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  pillTextActive: {
    color: Colors.primary,
  },
  modalFooter: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  submitBtn: {
    height: 54,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.soft,
  },
  inBtnColor: {
    backgroundColor: Colors.success,
  },
  outBtnColor: {
    backgroundColor: Colors.error,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitBtnText: {
    color: Colors.surface,
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 8,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSuccessContent: {
    width: '100%',
    height: 350,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.card,
    marginBottom: 20,
  },
  successText: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.success,
  },
  zonePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  zonePickerContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  zoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  zoneItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  zoneItemTextSelected: {
    color: Colors.primary,
    fontWeight: '800',
  }
});
