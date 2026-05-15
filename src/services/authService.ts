import { Platform } from 'react-native';
import api from './api';

export const authService = {
  login: async (credentials: any) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  employeeLogin: async (credentials: any) => {
    const response = await api.post('/auth/employee-login', credentials);
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  getEmployeeMe: async () => {
    const response = await api.get('/auth/employee-me');
    return response.data;
  },

  updateProfile: async (formData: FormData) => {
    const response = await api.put('/manager/profile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  registerDeviceToken: async (token: string) => {
    const response = await api.post('/auth/device-token', {
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android'
    });
    return response.data;
  },

  removeDeviceToken: async (token: string) => {
    const response = await api.delete('/auth/device-token', {
      data: { token }
    });
    return response.data;
  },
};
