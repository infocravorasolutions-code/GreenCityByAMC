import React, { useState } from 'react';
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
import { Lock, Phone, ChevronRight, Eye, EyeOff } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/Theme';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

const { height } = Dimensions.get('window');



export default function LoginScreen({ navigation }: any) {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!mobile.trim()) {
      Alert.alert('Error', 'Please enter your mobile number');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const roles: ('employee' | 'supervisor' | 'sso' | 'manager' | 'admin')[] = [
        'employee',
        'supervisor',
        'sso',
        'manager',
        'admin',
      ];

      // Fire authentication checks in parallel for all roles
      const promises = roles.map(async (role) => {
        try {
          let res;
          if (role === 'employee') {
            res = await authService.employeeLogin({ mobile: mobile.trim(), password });
          } else {
            res = await authService.login({ mobile: mobile.trim(), password, role });
          }
          if (res && res.token) {
            return { role, res };
          }
          throw new Error('No token');
        } catch (e) {
          throw e;
        }
      });

      // Safe engine promise resolution helper (custom Promise.any)
      const firstSuccessful = async (proms: Promise<{ role: string; res: any }>[]) => {
        return new Promise<{ role: string; res: any }>((resolve, reject) => {
          let rejectedCount = 0;
          let lastError: any = null;
          proms.forEach((p) => {
            p.then((val) => {
              resolve(val);
            }).catch((err) => {
              rejectedCount++;
              lastError = err;
              if (rejectedCount === proms.length) {
                reject(lastError || new Error('Invalid credentials'));
              }
            });
          });
        });
      };

      const successfulAuth = await firstSuccessful(promises);

      console.log(`[Auto-Detected Login Success] Role: ${successfulAuth.role}`, JSON.stringify(successfulAuth.res, null, 2));

      if (successfulAuth.role === 'admin') {
        throw new Error('ઍડમિન રોલે વેબ પેનલ દ્વારા લોગીન કરવું આવશ્યક છે. (Admin role must login via the Web Panel.)');
      }

      if (successfulAuth.res && successfulAuth.res.token) {
        await login(successfulAuth.res.token, successfulAuth.res.user);
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
        </View>

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
});
