import api from './api';

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

export const ssoService = {
  getTickets: async (today?: boolean) => {
    const response = await api.get('/sso/ccr', { params: { today: today ? 'true' : undefined } });
    return response.data.ccrs as CcrTicket[];
  },

  getVehicles: async () => {
    const response = await api.get('/sso/vehicles');
    return response.data.vehicles;
  },

  getTicketById: async (id: string) => {
    const response = await api.get(`/sso/ccr/${id}`);
    return response.data.ccr as CcrTicket;
  },

  createTicket: async (data: any) => {
    // If no image is present, send as standard JSON
    if (!data.image) {
      const response = await api.post('/sso/ccr', {
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

    const response = await api.post('/sso/ccr', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.ccr;
  },

  updateTicketStatus: async (ticketId: string, status: 'pending' | 'resolved') => {
    const response = await api.put(`/sso/ccr/${ticketId}`, { status });
    return response.data.ccr;
  },

  getLiveLocations: async () => {
    const response = await api.get('/sso/today/vehicles');
    return response.data.items || response.data.locations || response.data.vehicles || [];
  },

  getTripAnalytics: async () => {
    const response = await api.get('/sso/analytics/trips');
    return response.data.analytics;
  },

  getVehicleTrip: async (vehicleId: string) => {
    const response = await api.get(`/sso/today/vehicles/${vehicleId}/trip`);
    return response.data;
  },

  getHistory: async (params?: { startDate?: string; endDate?: string; type?: string }) => {
    const response = await api.get('/sso/history', { params });
    return response.data.history || [];
  },

  getVehicleHistory: async (vehicleId: string, limit: number = 200) => {
    const response = await api.get(`/sso/today/vehicles/${vehicleId}/history`, { params: { limit } });
    return response.data;
  },

  getVehicleSummary: async (vehicleId: string) => {
    const response = await api.get(`/sso/today/vehicles/${vehicleId}/summary`);
    return response.data;
  },
};
