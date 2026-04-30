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

export default api;
