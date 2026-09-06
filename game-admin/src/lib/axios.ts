"use client";

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach((p) => {
    if (error) {
      p.reject(error);
    } else {
      p.resolve(token);
    }
  });
  failedQueue = [];
}

const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const api: AxiosInstance = axios.create({
  baseURL: apiBase,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach token from localStorage (or in-memory) on each request
api.interceptors.request.use((config: any) => {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (token && config.headers) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err: any) => {
    const originalConfig = err.config;

    if (!originalConfig) return Promise.reject(err);

    const status = err.response?.status;

    if (status === 401 && !originalConfig._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalConfig.headers) {
              originalConfig.headers["Authorization"] = `Bearer ${token}`;
            }
            return api(originalConfig);
          })
          .catch((e) => Promise.reject(e));
      }

      originalConfig._retry = true;
      isRefreshing = true;

      return new Promise(async (resolve, reject) => {
        try {
          // Try refresh endpoint. If backend uses cookie-based refresh, no body needed.
          const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
          const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

          const response = await api.post(
            "/auth/refresh",
            refreshToken ? { userId, refreshToken } : { userId },
            { skipAuthRefresh: true } as any
          );

          const newAccessToken = response.data?.accessToken;
          const newRefreshToken = response.data?.refreshToken;

          if (newAccessToken) {
            try {
              localStorage.setItem("accessToken", newAccessToken);
            } catch (e) {}

            if (newRefreshToken) {
              try {
                localStorage.setItem("refreshToken", newRefreshToken);
              } catch (e) {}
            }

            api.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;
            if (originalConfig.headers) {
              originalConfig.headers["Authorization"] = `Bearer ${newAccessToken}`;
            }
            processQueue(null, newAccessToken);
            resolve(api(originalConfig));
          } else {
            processQueue(new Error("No access token returned"), null);
            reject(err);
          }
        } catch (e) {
          processQueue(e as Error, null);
          // If refresh failed, clear tokens
          try {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("userId");
          } catch (e) {}
          // redirect to login so user can re-authenticate
          try {
            if (typeof window !== "undefined") window.location.href = "/login";
          } catch (e) {}
          reject(e);
        } finally {
          isRefreshing = false;
        }
      });
    }

    return Promise.reject(err);
  }
);

export default api;
