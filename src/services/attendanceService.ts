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
  } catch (e) {}
  return ''; // fallback, let the API decide
};

export const attendanceService = {
  stepIn: async (formData: FormData) => {
    // Both Manager and Supervisor now use the same backend route
    const response = await api.post('/attendence/step-in', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  stepOut: async (data: any) => {
    // Both Manager and Supervisor now use the same backend route
    const response = await api.post('/attendence/step-out', data);
    return response.data;
  },

  employeeStepIn: async (formData: FormData) => {
    const response = await api.post('/employee-attendance/step-in', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  employeeStepOut: async (formData: FormData) => {
    const response = await api.post('/employee-attendance/step-out', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getTodayAttendance: async () => {
    const response = await api.get('/employee-attendance/today', {
      params: { _t: Date.now() },
    });
    return response.data;
  },

  getAttendanceList: async (from?: string, to?: string) => {
    let zone;
    try { zone = await AsyncStorage.getItem('selectedZone'); } catch (e) {}
    const response = await api.get('/attendence', {
      params: { from, to, limit: 500, _t: Date.now(), ...(zone ? { zone } : {}) },
    });
    return response.data;
  },

  getEmployeeHistory: async (employeeId: string, from?: string, to?: string) => {
    const response = await api.get(`/attendence/employee/${employeeId}`, {
      params: { from, to },
    });
    return response.data;
  },
};
