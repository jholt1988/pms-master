import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse, AxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

interface ApiErrorResponse {
  message?: string;
  statusCode?: number;
  error?: string;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';
const AUTH_TOKEN_KEY = 'auth_token';
const ENABLE_DEBUG = process.env.EXPO_PUBLIC_ENABLE_DEBUG_LOGGING === 'true';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      if (ENABLE_DEBUG) {
        console.log('[API Request]', {
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params,
          data: config.data,
        });
      }
    } catch (error) {
      console.error('[API Client] Error reading auth token:', error);
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('[API Client] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors and token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    if (ENABLE_DEBUG) {
      console.log('[API Response]', {
        status: response.status,
        url: response.config.url,
      });
    }
    return response;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config;

    if (ENABLE_DEBUG) {
      console.error('[API Error]', {
        status: error.response?.status,
        url: error.config?.url,
        message: error.message,
        data: error.response?.data,
      });
    }

    // Handle 401 Unauthorized - token expired
    if (error.response?.status === 401 && originalRequest) {
      try {
        // Clear expired token
        await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
        
        // TODO: Dispatch logout action to Redux store
        // This will be implemented when we set up navigation
        console.log('[API Client] Token expired, user needs to login again');
        
        // Optionally attempt token refresh here if backend supports it
        // For now, just redirect to login by throwing error
      } catch (tokenError) {
        console.error('[API Client] Error handling token expiration:', tokenError);
      }
    }

    // Return standardized error
    return Promise.reject({
      message: error.response?.data?.message || error.message || 'An error occurred',
      status: error.response?.status,
      data: error.response?.data,
    });
  }
);

// API service methods
export const apiService = {
  // Generic methods
  get: <TResponse = unknown, TRequest = unknown>(url: string, config?: AxiosRequestConfig<TRequest>) =>
    apiClient.get<TResponse>(url, config).then((res) => res.data),

  post: <TResponse = unknown, TBody = unknown>(url: string, data?: TBody, config?: AxiosRequestConfig<TBody>) =>
    apiClient.post<TResponse>(url, data, config).then((res) => res.data),

  put: <TResponse = unknown, TBody = unknown>(url: string, data?: TBody, config?: AxiosRequestConfig<TBody>) =>
    apiClient.put<TResponse>(url, data, config).then((res) => res.data),

  patch: <TResponse = unknown, TBody = unknown>(url: string, data?: TBody, config?: AxiosRequestConfig<TBody>) =>
    apiClient.patch<TResponse>(url, data, config).then((res) => res.data),

  delete: <TResponse = unknown, TRequest = unknown>(url: string, config?: AxiosRequestConfig<TRequest>) =>
    apiClient.delete<TResponse>(url, config).then((res) => res.data),

  // Token management
  setAuthToken: async (token: string) => {
    try {
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
      console.log('[API Client] Auth token saved');
    } catch (error) {
      console.error('[API Client] Error saving auth token:', error);
      throw error;
    }
  },

  getAuthToken: async () => {
    try {
      return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    } catch (error) {
      console.error('[API Client] Error reading auth token:', error);
      return null;
    }
  },

  clearAuthToken: async () => {
    try {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      console.log('[API Client] Auth token cleared');
    } catch (error) {
      console.error('[API Client] Error clearing auth token:', error);
    }
  },
};

export default apiClient;
