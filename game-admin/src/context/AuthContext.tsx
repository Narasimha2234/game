"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/axios";
import { useRouter } from "next/navigation";

type User = {
  id?: string | number;
  name?: string;
  roles?: string[];
  [key: string]: any;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (payload: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Try to hydrate from stored token on mount
    const accessToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (accessToken) {
      api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
      // hydrate basic user from localStorage if available
      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      const userName = typeof window !== "undefined" ? localStorage.getItem("userName") : null;
      if (userId) {
        setUser({ id: userId, name: userName ?? undefined });
      } else {
        setUser(null);
      }
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async ({ username, password }: { username: string; password: string }) => {
    const res = await api.post("/auth/login", { mobile: username, password });
    const accessToken = res.data?.accessToken;
    const refreshToken = res.data?.refreshToken;
    const user = res.data?.user ?? null;

    if (!accessToken) throw new Error("No access token returned from server");

    try {
      localStorage.setItem("accessToken", accessToken);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
      if (user?.id) localStorage.setItem("userId", String(user.id));
      if (user?.name) localStorage.setItem("userName", String(user.name));
    } catch (e) {}

    api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
    setUser(user);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      // ignore network errors
    }
    try {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userId");
      localStorage.removeItem("userName");
    } catch (e) {}
    setUser(null);
    delete api.defaults.headers.common["Authorization"];
    router.push("/login");
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
