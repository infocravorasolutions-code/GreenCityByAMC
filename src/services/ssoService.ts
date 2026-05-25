import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CcrTicket {
  _id: string;
  type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'resolved';
  zone: string;
  vehicleId?: any;
  ssoId: string;
  createdAt: string;
}

const getRolePath = async (): Promise<string> => {
  try {
    const userDataStr = await AsyncStorage.getItem('userData');
    if (userDataStr) {
      const user = JSON.parse(userDataStr);
      if (user && user.role === 'supervisor') {
        return '/supervisor';
      }
    }
  } catch (e) {
    console.error('[ssoService] Failed to read role for dynamic prefix:', e);
  }
  return '/sso';
};

export const ssoService = {
  getTickets: async (today?: boolean, zone?: string) => {
    const path = await getRolePath();
    const response = await api.get(`${path}/ccr`, { params: { today: today ? 'true' : undefined, zone } });
    return response.data.ccrs as CcrTicket[];
  },

  getVehicles: async (zone?: string) => {
    const path = await getRolePath();
    const response = await api.get(`${path}/vehicles`, { params: { zone } });
    return response.data.vehicles;
  },

  getTicketById: async (id: string, zone?: string) => {
    const path = await getRolePath();
    const response = await api.get(`${path}/ccr/${id}`, { params: { zone } });
    return response.data.ccr as CcrTicket;
  },

  createTicket: async (data: any) => {
    const path = await getRolePath();
    // If no image is present, send as standard JSON
    if (!data.image) {
      const response = await api.post(`${path}/ccr`, {
        type: data.type,
        title: data.title,
        description: data.description,
        priority: data.priority,
        vehicleId: data.vehicleId,
        location: data.location // Include if present
      });
      return response.data.ccr;
    }

    // If image is present, use FormData for multi-part upload
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key === 'location' && data[key]) {
        formData.append('location', JSON.stringify(data[key]));
      } else if (key === 'image' && data[key]) {
        formData.append('image', {
          uri: data[key].uri,
          type: data[key].type || 'image/jpeg',
          name: data[key].fileName || 'ccr_attachment.jpg',
        } as any);
      } else if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]);
      }
    });

    const response = await api.post(`${path}/ccr`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.ccr;
  },

  updateTicketStatus: async (ticketId: string, status: 'pending' | 'resolved') => {
    const path = await getRolePath();
    const response = await api.put(`${path}/ccr/${ticketId}`, { status });
    return response.data.ccr;
  },

  getLiveLocations: async (zone?: string) => {
    const path = await getRolePath();
    const response = await api.get(`${path}/today/vehicles`, { params: { zone } });
    return response.data.items || response.data.locations || response.data.vehicles || [];
  },

  getTripAnalytics: async (zone?: string) => {
    const path = await getRolePath();
    const response = await api.get(`${path}/analytics/trips`, { params: { zone } });
    return response.data.analytics;
  },

  getVehicleTrip: async (vehicleId: string, date?: string, zone?: string) => {
    const path = await getRolePath();
    const response = await api.get(`${path}/today/vehicles/${vehicleId}/trip`, { params: { date, zone } });
    return response.data;
  },

  getHistory: async (params?: { startDate?: string; endDate?: string; type?: string; zone?: string }) => {
    const path = await getRolePath();
    const response = await api.get(`${path}/history`, { params });
    return response.data.history || [];
  },

  getVehicleHistory: async (vehicleId: string, date?: string, limit: number = 200, zone?: string) => {
    const path = await getRolePath();
    const response = await api.get(`${path}/today/vehicles/${vehicleId}/history`, { params: { limit, date, zone } });
    return response.data;
  },

  getVehicleSummary: async (vehicleId: string, date?: string, zone?: string) => {
    const path = await getRolePath();
    const response = await api.get(`${path}/today/vehicles/${vehicleId}/summary`, { params: { date, zone } });
    return response.data;
  },

  getManagers: async () => {
    const path = await getRolePath();
    const response = await api.get(`${path}/managers`);
    return response.data.managers || [];
  },

  getVehiclesForCcr: async () => {
    const path = await getRolePath();
    const response = await api.get(`${path}/vehicles-for-ccr`);
    return response.data.items || [];
  },

  createManager: async (data: any) => {
    const path = await getRolePath();
    const isFormData = data instanceof FormData;
    const response = await api.post(`${path}/managers`, data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return response.data.user;
  },

  updateManager: async (id: string, data: any) => {
    const path = await getRolePath();
    const isFormData = data instanceof FormData;
    const response = await api.put(`${path}/managers/${id}`, data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return response.data.user;
  },

  deleteManager: async (id: string) => {
    const path = await getRolePath();
    const response = await api.delete(`${path}/managers/${id}`);
    return response.data;
  },
};
