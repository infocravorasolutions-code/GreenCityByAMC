import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Production API Endpoint
const BASE_URL = 'https://api.greencityamc.com/api'; 

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the auth token to every request
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url} | Token Present: ${!!token}`);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to log API response errors in detail
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      console.log(`[API Response Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} | Status: ${error.response.status} | Data:`, error.response.data);
    } else {
      console.log(`[API Network/Unknown Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} | Error:`, error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
