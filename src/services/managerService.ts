import api from './api';

export const managerService = {
  getSummary: async () => {
    const response = await api.get('/manager/summary');
    return response.data;
  },

  getStats: async (from?: string, to?: string) => {
    const response = await api.get('/manager/attendance', {
      params: { from, to },
    });
    return response.data;
  },

  getEmployees: async () => {
    const response = await api.get(`/manager/employees?t=${Date.now()}`);
    return response.data;
  },

  createEmployee: async (formData: FormData) => {
    const response = await api.post('/manager/employees', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateEmployee: async (id: string, formData: FormData) => {
    const response = await api.put(`/manager/employees/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteEmployee: async (id: string) => {
    const response = await api.delete(`/manager/employees/${id}`);
    return response.data;
  },
};
