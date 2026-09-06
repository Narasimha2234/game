import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, STORAGE_KEYS } from '../api/client';

export interface UserProfile {
  id: string;
  name: string;
  mobile: string | null;
  email: string | null;
  role: string;
  walletBalance: number;
  isActive: boolean;
  createdAt: string;
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  walletBalance: number;
  error: string | null;

  // Actions
  initializeAuth: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  setWalletBalance: (balance: number) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true,
  walletBalance: 0,
  error: null,

  initializeAuth: async () => {
    try {
      const [token, userDataStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER_DATA),
      ]);

      if (token && userDataStr) {
        const parsedUser: UserProfile = JSON.parse(userDataStr);
        set({
          user: parsedUser,
          isAuthenticated: true,
          walletBalance: Number(parsedUser.walletBalance) || 0,
          isInitializing: false,
        });

        // Background refresh wallet to ensure up-to-date balance
        get().refreshWallet();
      } else {
        set({ isInitializing: false });
      }
    } catch (e) {
      set({ isInitializing: false });
    }
  },

  login: async (identifier: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/auth/login', {
        username: identifier.trim(),
        password,
      });

      const { accessToken, refreshToken, user } = response.data;

      if (!accessToken || !user) {
        throw new Error('Invalid response from authentication server');
      }

      // Store credentials
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
        refreshToken ? AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken) : Promise.resolve(),
        AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user)),
      ]);

      set({
        user,
        isAuthenticated: true,
        walletBalance: Number(user.walletBalance) || 0,
        isLoading: false,
        error: null,
      });

      return true;
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Login failed. Please check your credentials.';

      set({
        isLoading: false,
        error: errorMessage,
        isAuthenticated: false,
      });

      return false;
    }
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout').catch(() => {});
    } catch (e) {
      // ignore network errors on logout
    }

    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA),
    ]);

    set({
      user: null,
      isAuthenticated: false,
      walletBalance: 0,
      error: null,
    });
  },

  refreshWallet: async () => {
    const { user } = get();
    if (!user?.id) return;

    try {
      const res = await apiClient.get(`/api/users/${user.id}/wallet`);
      const walletData = res.data?.data;
      if (walletData && typeof walletData.walletBalance === 'number') {
        const newBal = Number(walletData.walletBalance);
        set((state) => ({
          walletBalance: newBal,
          user: state.user ? { ...state.user, walletBalance: newBal } : null,
        }));

        // update local cache
        const currentUser = get().user;
        if (currentUser) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(currentUser));
        }
      }
    } catch (err) {
      // silently fail if network error
    }
  },

  setWalletBalance: (balance: number) => {
    set((state) => ({
      walletBalance: balance,
      user: state.user ? { ...state.user, walletBalance: balance } : null,
    }));
  },

  clearError: () => set({ error: null }),
}));
