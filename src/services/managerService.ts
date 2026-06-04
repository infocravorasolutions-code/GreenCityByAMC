import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const getRolePath = async (): Promise<string> => {
  try {
    const userDataStr = await AsyncStorage.getItem('userData');
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      if (userData?.role === 'supervisor') {
        return '/supervisor';
      }
    }
  } catch (e) {
    // ignore
  }
  return '/manager'; // Fallback to manager
};

export const managerService = {
  getSummary: async () => {
    const rolePath = await getRolePath();
    const response = await api.get(`${rolePath}/summary`);
    return response.data;
  },

  getStats: async (from?: string, to?: string) => {
    const rolePath = await getRolePath();
    const zone = await AsyncStorage.getItem('selectedZone');
    const response = await api.get(`${rolePath}/attendance`, {
      params: { from, to, ...(zone ? { zone } : {}) },
    });
    return response.data;
  },

  getEmployees: async () => {
    const rolePath = await getRolePath();
    const response = await api.get(`${rolePath}/employees?t=${Date.now()}`);
    return response.data;
  },

  createEmployee: async (formData: FormData) => {
    const rolePath = await getRolePath();
    const response = await api.post(`${rolePath}/employees`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateEmployee: async (id: string, formData: FormData) => {
    const rolePath = await getRolePath();
    const response = await api.put(`${rolePath}/employees/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteEmployee: async (id: string) => {
    const rolePath = await getRolePath();
    const response = await api.delete(`${rolePath}/employees/${id}`);
    return response.data;
  },

  getSupervisors: async () => {
    const response = await api.get('/manager/supervisors');
    return response.data;
  },

  getManagersForEmployee: async () => {
    const response = await api.get('/supervisor/managers-for-employee');
    return response.data;
  },

  getTickets: async () => {
    const rolePath = await getRolePath();
    const response = await api.get(`${rolePath}/ccr`);
    return response.data.items;
  },
};
