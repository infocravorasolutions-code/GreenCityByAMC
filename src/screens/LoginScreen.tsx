import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Alert,
  Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lock, Phone, ChevronRight, Eye, EyeOff } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/Theme';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

const { height } = Dimensions.get('window');



export default function LoginScreen({ navigation: _navigation }: any) {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const [quickLoginUser, setQuickLoginUser] = useState<{
    mobile: string;
    name: string;
    role: string;
    photo?: string;
  } | null>(null);
  const [useManualLogin, setUseManualLogin] = useState(false);

  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedMobile = await AsyncStorage.getItem('savedMobile');
        const savedPassword = await AsyncStorage.getItem('savedPassword');
        const savedName = await AsyncStorage.getItem('savedName');
        const savedRole = await AsyncStorage.getItem('savedRole');
        const savedPhoto = await AsyncStorage.getItem('savedUserPhoto');
        if (savedMobile && savedPassword) {
          setQuickLoginUser({
            mobile: savedMobile,
            name: savedName || 'User',
            role: savedRole || 'employee',
            photo: savedPhoto || undefined,
          });
          // prefill form inputs just in case they switch to manual inputs
          setMobile(savedMobile);
          setPassword(savedPassword);
        }
      } catch (e) {
        console.error('Error loading saved credentials:', e);
      }
    };
    loadSavedCredentials();
  }, []);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'employee': return 'ડ્રાઈવર / કર્મચારી (Driver / Employee)';
      case 'supervisor': return 'સુપરવાઇઝર (Supervisor)';
      case 'sso': return 'SSO અધિકારી (SSO Officer)';
      case 'manager': return 'મેનેજર (Manager)';
      case 'admin': return 'એડમિન (Admin)';
      default: return role.toUpperCase();
    }
  };

  const performAuth = async (targetMobile: string, targetPassword: string) => {
    setLoading(true);
    try {
      // Make a single call to backend's login endpoint.
      // The Jignesh backend will auto-detect the user's role.
      const res = await authService.login({
        mobile: targetMobile.trim(),
        password: targetPassword,
      });

      console.log('[Auto-Detected Login Success]', JSON.stringify(res, null, 2));

      if (res && res.token) {
        const userObj = res.user;
        await AsyncStorage.setItem('savedMobile', targetMobile.trim());
        await AsyncStorage.setItem('savedPassword', targetPassword);
        await AsyncStorage.setItem('savedName', userObj.name || userObj.fullName || 'User');
        await AsyncStorage.setItem('savedRole', userObj.role || 'employee');
        await AsyncStorage.setItem('savedUserPhoto', userObj.image || userObj.profileImage || '');
        await login(res.token, userObj);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Login Error:', error);
      
      let message = 'કૃપા કરીને તમારા મોબાઇલ નંબર અને પાસવર્ડ તપાસો અને ફરી પ્રયાસ કરો. (Please check your credentials and try again.)';
      if (error.message && error.message.includes('વેબ પેનલ')) {
        message = error.message;
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message && error.message !== 'Invalid credentials' && error.message !== 'No token') {
        message = error.message;
      }
      
      Alert.alert('લોગિન નિષ્ફળ (Login Failed)', message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!mobile.trim()) {
      Alert.alert('Error', 'Please enter your mobile number');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }
    await performAuth(mobile, password);
  };

  const handleQuickLogin = async () => {
    try {
      const savedMobile = await AsyncStorage.getItem('savedMobile');
      const savedPassword = await AsyncStorage.getItem('savedPassword');
      if (savedMobile && savedPassword) {
        await performAuth(savedMobile, savedPassword);
      } else {
        Alert.alert('Error', 'No saved credentials found.');
      }
    } catch (e) {
      console.error('Quick login failed', e);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../assets/logo.png')}
              style={{ width: 200, height: 200, resizeMode: 'contain' }}
            />
          </View>
          <Text style={styles.welcomeText}>Welcome Back</Text>
          <Text style={styles.subtitleText}>Sign in to your account</Text>
        </View>

        {quickLoginUser && !useManualLogin ? (
          <View style={styles.formContainer}>
            <Text style={styles.welcomeBackText}>ફરી સ્વાગત છે (Welcome Back)</Text>
            
            <View style={styles.profileSection}>
              {quickLoginUser.photo ? (
                <Image source={{ uri: quickLoginUser.photo }} style={styles.quickLoginAvatar} />
              ) : (
                <View style={styles.quickLoginInitial}>
                  <Text style={styles.quickLoginInitialText}>
                    {quickLoginUser.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.quickLoginName}>{quickLoginUser.name}</Text>
              <Text style={styles.quickLoginRole}>
                {getRoleLabel(quickLoginUser.role)}
              </Text>
              <Text style={styles.quickLoginPhone}>{quickLoginUser.mobile}</Text>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleQuickLogin}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'સાઇન ઇન થઈ રહ્યું છે...' : 'અહીં ક્લિક કરી લોગીન કરો'}
              </Text>
              {!loading && <ChevronRight size={20} color={Colors.surface} />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.switchAccountBtn}
              onPress={() => setUseManualLogin(true)}
              disabled={loading}
            >
              <Text style={styles.switchAccountBtnText}>બીજા ખાતાથી લોગિન કરો (Use another account)</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <Text style={styles.roleHint}>Enter your registered mobile number and password to sign in</Text>

            {/* Mobile Number Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobile Number</Text>
              <View style={styles.inputWrapper}>
                <Phone size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="9876543210"
                  placeholderTextColor={Colors.textSecondary}
                  value={mobile}
                  onChangeText={setMobile}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  maxLength={15}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
                  {showPassword ? (
                    <EyeOff size={20} color={Colors.textSecondary} />
                  ) : (
                    <Eye size={20} color={Colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Authenticating...' : 'Sign In'}
              </Text>
              {!loading && <ChevronRight size={20} color={Colors.surface} />}
            </TouchableOpacity>

            {quickLoginUser && (
              <TouchableOpacity 
                style={styles.switchAccountBtn}
                onPress={() => setUseManualLogin(false)}
                disabled={loading}
              >
                <Text style={styles.switchAccountBtnText}>પાછા જાઓ (Go Back)</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerLabelText}>POWERED BY</Text>
          <Image
            source={require('../assets/cravoraLogo.png')}
            style={{ width: 100, height: 100, resizeMode: 'contain', marginVertical: 6 }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
    minHeight: height,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitleText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  formContainer: {
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    ...Shadows.medium,
  },

  roleHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    marginTop: Spacing.xs,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: Colors.text,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.soft,
    marginTop: Spacing.sm,
  },
  loginButtonDisabled: {
    backgroundColor: Colors.primaryLight,
  },
  loginButtonText: {
    color: Colors.surface,
    fontSize: 18,
    fontWeight: '700',
    marginRight: Spacing.sm,
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  footerLabelText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    top: 25,
  },
  welcomeBackText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  profileSection: {
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  quickLoginAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: Spacing.md,
  },
  quickLoginInitial: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  quickLoginInitialText: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.primary,
  },
  quickLoginName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  quickLoginRole: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  quickLoginPhone: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  switchAccountBtn: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  switchAccountBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
});
