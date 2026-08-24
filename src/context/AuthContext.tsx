import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { authService } from '../services/authService';
import { notificationService } from '../services/notificationService';

interface User {
  _id: string;
  fullName?: string; // Manager
  name?: string;     // Employee
  phone?: string;    // Employee
  role: string;
  zone?: string;
  zones?: string[];
  zoneLabel?: string;
  image?: string;
  tenantId?: string;
  tenant?: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  selectedZone: string | null;
  setSelectedZone: (zone: string) => void;
  login: (token: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [selectedZone, setSelectedZoneState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setSelectedZone = async (zone: string) => {
    setSelectedZoneState(zone);
    await AsyncStorage.setItem('selectedZone', zone);
  };

  useEffect(() => {
    // Load stored token and user on start
    const loadStorageData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        const storedUser = await AsyncStorage.getItem('userData');
        const storedZone = await AsyncStorage.getItem('selectedZone');
        
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          if (storedZone) setSelectedZoneState(storedZone);
        }
      } catch (e) {
        console.error('Failed to load auth data', e);
      } finally {
        setLoading(false);
      }
    };

    loadStorageData();
  }, []);

  useEffect(() => {
    // Add interceptor to handle 401 and 403 errors globally
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response) {
          const status = error.response.status;
          
          if (status === 401) {
            const requestUrl = error.config?.url || '';
            // Never trigger auto-logout for credentials checks on login endpoints
            if (requestUrl.includes('/auth/login') || requestUrl.includes('/auth/employee-login')) {
              console.log('[AuthInterceptor] 401 detected on login endpoint. Skipping auto-logout.');
            } else {
              console.warn('[AuthInterceptor] 401 Unauthorized detected. Clearing active session.');
              await logout();
            }
          } else if (status === 403) {
            const requestUrl = error.config?.url || '';
            // Check if it's the specific GPS_DISABLED error which we handle gracefully in UI
            if (error.response.data?.code === 'GPS_DISABLED') {
              console.log('[AuthInterceptor] 403 GPS_DISABLED detected. Skipping auto-logout.');
            } else if (requestUrl.includes('/auth/login') || requestUrl.includes('/auth/employee-login')) {
              console.log('[AuthInterceptor] 403 detected on login endpoint. Skipping auto-logout.');
            } else {
              console.warn('[AuthInterceptor] 403 Forbidden detected. Role or Tenant access may have been invalidated. Clearing active session.');
              await logout();
            }
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = async (newToken: string, userData: User) => {
    try {
      await AsyncStorage.setItem('userToken', newToken);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);

      // Explicitly register device token using the dedicated API after token is saved
      const fcmToken = await notificationService.getTokenOnly();
      if (fcmToken) {
        console.log('[AuthContext] Registering Device Token:', fcmToken);
        await authService.registerDeviceToken(fcmToken).catch(e => console.log('[AuthContext] Failed to register token', e));
      }
    } catch (e) {
      console.error('Failed to save auth data', e);
    }
  };

  const logout = async () => {
    try {
      const fcmToken = await notificationService.getTokenOnly();
      if (fcmToken) {
        await authService.removeDeviceToken(fcmToken).catch(e => console.log('Failed to remove token from server', e));
      }
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      setToken(null);
      setUser(null);
    } catch (e) {
      console.error('Failed to clear auth data', e);
    }
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    AsyncStorage.setItem('userData', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, selectedZone, setSelectedZone, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
