import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid,
  SafeAreaView
} from 'react-native';
import {
  Camera as CameraIcon,
  RefreshCw,
  LogOut,
  LogIn,
  CheckCircle2,
  ChevronLeft
} from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '../theme/Theme';
import { useAuth } from '../context/AuthContext';
import { attendanceService } from '../services/attendanceService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import { launchCamera } from 'react-native-image-picker';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

export default function EmployeeAttendanceScreen({ navigation }: any) {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [attendance, setAttendance] = useState<any>(null);
  
  const [photo, setPhoto] = useState<any>(null);
  const [rawCoords, setRawCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [locationText, setLocationText] = useState('');
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    fetchTodayStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTodayStatus = async () => {
    try {
      const response = await attendanceService.getTodayAttendance();
      const record = response?.attendance ?? response ?? null;
      const hasStepInVal = record && (record.stepIn || record.stepInTime);
      if (record && hasStepInVal && hasStepInVal !== 'null') {
        const normalized = {
          ...record,
          stepIn: record.stepIn || record.stepInTime,
          stepOut: record.stepOut || record.stepOutTime,
        };
        setAttendance(normalized);
        await AsyncStorage.setItem('@attendance_today', JSON.stringify(normalized));
      } else {
        const savedStr = await AsyncStorage.getItem('@attendance_today');
        if (savedStr) {
          const saved = JSON.parse(savedStr);
          const rDate = saved.date || saved.createdAt || saved.stepIn;
          if (rDate) {
            const localTodayStr = new Date().toLocaleDateString('en-CA');
            const recordDateStr = new Date(rDate).toLocaleDateString('en-CA');
            if (recordDateStr === localTodayStr) {
              setAttendance(saved);
            } else {
              await AsyncStorage.removeItem('@attendance_today');
              setAttendance(null);
            }
          } else {
            setAttendance(null);
          }
        } else {
          setAttendance(null);
        }
      }
    } catch (error) {
      console.error('[EmployeeAttendance] Fetching attendance failed:', error);
      try {
        const savedStr = await AsyncStorage.getItem('@attendance_today');
        if (savedStr) {
          const saved = JSON.parse(savedStr);
          const rDate = saved.date || saved.createdAt || saved.stepIn;
          if (rDate) {
            const localTodayStr = new Date().toLocaleDateString('en-CA');
            const recordDateStr = new Date(rDate).toLocaleDateString('en-CA');
            if (recordDateStr === localTodayStr) {
              setAttendance(saved);
            } else {
              await AsyncStorage.removeItem('@attendance_today');
              setAttendance(null);
            }
          } else {
            setAttendance(null);
          }
        } else {
          setAttendance(null);
        }
      } catch (e) {
        console.error('[EmployeeAttendance] Error reading AsyncStorage backup:', e);
      }
    } finally {
      setLoading(false);
      fetchGPSAsync();
    }
  };

  const fetchGPSAsync = async () => {
    setFetchingLocation(true);
    setLocationText('સ્થાન આપમેળે શોધી રહ્યું છે...');

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
          setLocationText(user?.zoneLabel || user?.zone || 'AMC Area');
          return;
        }
      } catch {
        setFetchingLocation(false);
        setLocationText(user?.zoneLabel || user?.zone || 'AMC Area');
        return;
      }
    }

    // Forcefully stop loading after 8 seconds in case native GPS API completely hangs
    const fallbackTimeout = setTimeout(() => {
      setFetchingLocation(false);
      setLocationText(prev => {
        if (prev === 'સ્થાન આપમેળે શોધી રહ્યું છે...' || !prev) {
          return user?.zoneLabel || user?.zone || 'AMC Area';
        }
        return prev;
      });
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
          setLocationText(json.display_name || user?.zoneLabel || user?.zone || 'AMC Area');
        } catch {
          setLocationText(user?.zoneLabel || user?.zone || 'AMC Area');
        }
        setFetchingLocation(false);
      },
      (error) => {
        clearTimeout(fallbackTimeout);
        console.warn(`[GPS ERROR] ${error.message}`);
        setLocationText(user?.zoneLabel || user?.zone || 'AMC Area');
        setFetchingLocation(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5000 }
    );
  };

  const capturePhoto = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('પરવાનગી નકારી', 'કેમેરાની પરવાનગી જરૂરી છે.');
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

  useEffect(() => {
    if (!loading) {
      const soVal = attendance?.stepOut;
      const soTimeVal = attendance?.stepOutTime;
      const hasValidSO = (soVal && soVal !== 'null') || (soTimeVal && soTimeVal !== 'null');
      const isSteppedIn = attendance && 
        (!!attendance.stepIn || !!attendance.stepInTime) && 
        attendance.stepIn !== 'null' && 
        attendance.stepInTime !== 'null' && 
        !hasValidSO;
      const isSteppingIn = !attendance || !isSteppedIn;

      if (isSteppingIn) {
        const timer = setTimeout(() => {
          capturePhoto();
        }, 800);
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const triggerSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      navigation.navigate('HOME'); // Navigate back after success
    }, 2000);
  };

  const handleSubmission = async () => {
    const soVal2 = attendance?.stepOut;
    const soTimeVal2 = attendance?.stepOutTime;
    const hasValidSO2 = (soVal2 && soVal2 !== 'null') || (soTimeVal2 && soTimeVal2 !== 'null');
    const isSteppedIn = attendance && 
      (!!attendance.stepIn || !!attendance.stepInTime) && 
      attendance.stepIn !== 'null' && 
      attendance.stepInTime !== 'null' && 
      !hasValidSO2;
    const isSteppingIn = !attendance || !isSteppedIn;
    
    if (isSteppingIn && !photo) {
      Alert.alert('ફોટો જરૂરી છે', 'કૃપા કરીને સેલ્ફી લેવા માટે કેમેરા બોક્સ પર ટેપ કરો.');
      return;
    }

    if (!locationText.trim()) {
      Alert.alert('સ્થાન જરૂરી છે', 'કૃપા કરીને સ્થાન આપમેળે શોધવાની રાહ જુઓ અથવા તેને જાતે લખો.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('latitude', String(rawCoords?.lat || 0));
      formData.append('longitude', String(rawCoords?.lng || 0));
      formData.append('address', locationText);
      if (note) formData.append('note', note);

      let response;
      if (isSteppingIn) {
        formData.append('stepInImage', {
          uri: photo.uri,
          type: photo.type || 'image/jpeg',
          name: photo.fileName || 'photo.jpg',
        } as any);
        response = await attendanceService.employeeStepIn(formData);
      } else {
        response = await attendanceService.employeeStepOut(formData);
      }

      const record = response?.attendance ?? response ?? null;
      if (record) {
        const normalized = {
          ...record,
          stepIn: record.stepIn || record.stepInTime,
          stepOut: record.stepOut || record.stepOutTime,
        };
        setAttendance(normalized); // Update local state immediately so button changes
        await AsyncStorage.setItem('@attendance_today', JSON.stringify(normalized));
      }
      
      triggerSuccess();
    } catch (error: any) {
      console.error(`[Attendance] FAILED:`, error);
      Alert.alert('ભૂલ', error?.response?.data?.message || 'હાજરી સાચવી શકાઈ નથી. કૃપા કરીને ફરી પ્રયાસ કરો.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const renderSoVal = attendance?.stepOut;
  const renderSoTimeVal = attendance?.stepOutTime;
  const renderHasValidSO = (renderSoVal && renderSoVal !== 'null') || (renderSoTimeVal && renderSoTimeVal !== 'null');
  const isSteppedIn = attendance && 
    (!!attendance.stepIn || !!attendance.stepInTime) && 
    attendance.stepIn !== 'null' && 
    attendance.stepInTime !== 'null' && 
    !renderHasValidSO;
  const isSteppingIn = !attendance || !isSteppedIn;
  const isCompleted = false; // Allow unlimited step-in/out cycles throughout the day

  if (isCompleted) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <CheckCircle2 size={80} color={Colors.success} />
        <Text style={styles.completedText}>તમે આજે તમારી શિફ્ટ પૂર્ણ કરી લીધી છે!</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {showSuccess ? (
          <Animated.View entering={FadeIn} style={[styles.container, styles.centerContent]}>
            <Animated.View entering={ZoomIn.duration(400)}>
              <CheckCircle2 size={80} color={Colors.success} style={{ marginBottom: 20 }} />
            </Animated.View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: Colors.success }}>સફળતાપૂર્વક નોંધાયું!</Text>
          </Animated.View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            <View style={[styles.header, { flexDirection: 'row', alignItems: 'center' }]}>
               <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, marginRight: 8, marginLeft: -8 }}>
                 <ChevronLeft size={28} color={Colors.text} />
               </TouchableOpacity>
               <View style={{ flex: 1 }}>
                 <Text style={styles.title}>{isSteppingIn ? 'હાજરી દાખલ કરો (સ્ટેપ ઇન)' : 'હાજરી બહાર કરો (સ્ટેપ આઉટ)'}</Text>
                 <Text style={styles.subtitle}>હાજરી નોંધવા માટે તમારી વિગતો મેળવો</Text>
               </View>
            </View>

            {/* Selfie Section */}
            {isSteppingIn && (
              <View style={styles.section}>
                <Text style={styles.label}>સેલ્ફી વેરીફિકેશન</Text>
                <TouchableOpacity
                  style={styles.viewfinder}
                  onPress={capturePhoto}
                  activeOpacity={0.8}
                >
                  {photo ? (
                    <View style={styles.imageContainer}>
                      <Image source={{ uri: photo.uri }} style={styles.capturedImage} />
                      <View style={styles.retakeOverlay}>
                        <View style={styles.retakeIconCircle}>
                          <RefreshCw size={24} color={Colors.surface} />
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.emptyCamera}>
                      <CameraIcon size={48} color={Colors.textSecondary} />
                      <Text style={styles.emptyCameraText}>ફોટો લેવા માટે ટેપ કરો</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>સ્થાન (સરનામું)</Text>
                <View style={styles.locationInputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="સરનામું જાતે દાખલ કરો..."
                    value={locationText}
                    onChangeText={setLocationText}
                  />
                  {fetchingLocation && (
                     <ActivityIndicator size="small" color={Colors.primary} style={styles.locationLoader} />
                  )}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>નોંધ (વૈકલ્પિક)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="વધારાની વિગતો ઉમેરો..."
                  multiline
                  value={note}
                  onChangeText={setNote}
                />
              </View>
            </View>

            {/* Organic Integrated Button */}
            <View style={{ marginTop: Spacing.xl }}>
               <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    isSteppingIn ? styles.inBtnColor : styles.outBtnColor,
                    submitting && { opacity: 0.5 }
                  ]}
                  onPress={handleSubmission}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={Colors.surface} />
                  ) : (
                    <View style={styles.submitBtnContent}>
                      {isSteppingIn ? <LogIn size={20} color={Colors.surface} /> : <LogOut size={20} color={Colors.surface} />}
                      <Text style={styles.submitBtnText}>
                        {isSteppingIn ? 'હાજરી દાખલ કરો' : 'હાજરી બહાર કરો'}
                      </Text>
                    </View>
                  )}
               </TouchableOpacity>
            </View>

          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  scrollBody: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
    paddingTop: 50,
  },
  header: {
    marginBottom: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 6,
    fontWeight: '500',
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewfinder: {
    width: '100%',
    height: 320,
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
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
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retakeIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  emptyCamera: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyCameraText: {
    marginTop: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 16,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  locationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.lg,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  input: {
    flex: 1,
    height: 60,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: 'transparent',
    fontWeight: '500',
  },
  locationLoader: {
    position: 'absolute',
    right: Spacing.lg,
  },
  textArea: {
    height: 120,
    paddingTop: Spacing.lg,
    textAlignVertical: 'top',
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.lg,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  submitBtn: {
    height: 64,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  inBtnColor: {
    backgroundColor: Colors.primary,
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
    fontWeight: '900',
    marginLeft: 12,
    letterSpacing: 1,
  },
  completedText: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  }
});
