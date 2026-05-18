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
  getTickets: async (today?: boolean) => {
    const path = await getRolePath();
    const response = await api.get(`${path}/ccr`, { params: { today: today ? 'true' : undefined } });
    return response.data.ccrs as CcrTicket[];
  },

  getVehicles: async () => {
    const path = await getRolePath();
    const response = await api.get(`${path}/vehicles`);
    return response.data.vehicles;
  },

  getTicketById: async (id: string) => {
    const path = await getRolePath();
    const response = await api.get(`${path}/ccr/${id}`);
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

  getLiveLocations: async () => {
    const path = await getRolePath();
    const response = await api.get(`${path}/today/vehicles`);
    return response.data.items || response.data.locations || response.data.vehicles || [];
  },

  getTripAnalytics: async () => {
    const path = await getRolePath();
    const response = await api.get(`${path}/analytics/trips`);
    return response.data.analytics;
  },

  getVehicleTrip: async (vehicleId: string, date?: string) => {
    const path = await getRolePath();
    const response = await api.get(`${path}/today/vehicles/${vehicleId}/trip`, { params: { date } });
    return response.data;
  },

  getHistory: async (params?: { startDate?: string; endDate?: string; type?: string }) => {
    const path = await getRolePath();
    const response = await api.get(`${path}/history`, { params });
    return response.data.history || [];
  },

  getVehicleHistory: async (vehicleId: string, date?: string, limit: number = 200) => {
    const path = await getRolePath();
    const response = await api.get(`${path}/today/vehicles/${vehicleId}/history`, { params: { limit, date } });
    return response.data;
  },

  getVehicleSummary: async (vehicleId: string, date?: string) => {
    const path = await getRolePath();
    const response = await api.get(`${path}/today/vehicles/${vehicleId}/summary`, { params: { date } });
    return response.data;
  },
};
