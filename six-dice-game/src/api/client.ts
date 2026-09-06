import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import Constants from 'expo-constants';

// Storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@six_dice_access_token',
  REFRESH_TOKEN: '@six_dice_refresh_token',
  USER_DATA: '@six_dice_user_data',
  API_BASE_URL: '@six_dice_api_url',
};

export function getBackendBaseUrl(): string {
  // 1. If running in Expo Go on mobile, hostUri contains the computer's local IP (e.g. "192.168.0.101:8081")
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:8080`;
    }
  }

  // 2. Default Wi-Fi IP fallback for physical devices
  return 'http://192.168.0.101:8080';
}

const DEFAULT_HOST = getBackendBaseUrl();

export const apiClient: AxiosInstance = axios.create({
  baseURL: DEFAULT_HOST,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach Access Token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const customUrl = await AsyncStorage.getItem(STORAGE_KEYS.API_BASE_URL);
      if (customUrl) {
        config.baseURL = customUrl;
      }

      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // ignore storage errors
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Seamless Auto-Refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!originalRequest) return Promise.reject(error);

    // If 401 Unauthorized and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        const userDataStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
        const user = userDataStr ? JSON.parse(userDataStr) : null;

        if (!refreshToken || !user?.id) {
          throw new Error('No refresh token or user session found');
        }

        // Call backend refresh endpoint
        const currentBaseUrl = (await AsyncStorage.getItem(STORAGE_KEYS.API_BASE_URL)) || getBackendBaseUrl();
        const refreshResponse = await axios.post(`${currentBaseUrl}/auth/refresh`, {
          userId: user.id,
          refreshToken,
        });

        const newAccessToken = refreshResponse.data?.accessToken;
        const newRefreshToken = refreshResponse.data?.refreshToken;

        if (newAccessToken) {
          await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
          if (newRefreshToken) {
            await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
          }

          apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          processQueue(null, newAccessToken);
          return apiClient(originalRequest);
        } else {
          throw new Error('Refresh endpoint returned no token');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        // Clear session on failed refresh
        await Promise.all([
          AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
          AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
          AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA),
        ]);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
