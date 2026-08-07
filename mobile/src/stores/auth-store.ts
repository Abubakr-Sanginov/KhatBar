import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "../types";
import { authApi } from "../api/auth";
import { ensureIdentityKeys } from "../lib/e2ee";

async function publishIdentity() {
  const { publicKey } = await ensureIdentityKeys();
  await authApi.uploadKey(publicKey);
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  setUsername: (username: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  login: async (email, password) => {
    const res = await authApi.login(email, password);
    await AsyncStorage.setItem("session_token", res.token);
    set({ user: res.user, token: res.token, isAuthenticated: true });
    await publishIdentity();
    await publishIdentity();
  },

  register: async (email, password, displayName) => {
    const res = await authApi.register(email, password, displayName);
    await AsyncStorage.setItem("session_token", res.token);
    set({ user: res.user, token: res.token, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {}
    await AsyncStorage.removeItem("session_token");
    set({ user: null, token: null, isAuthenticated: false });
  },

  checkSession: async () => {
    try {
      const token = await AsyncStorage.getItem("session_token");
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      const res = await authApi.getSession();
      set({ user: res.user, token, isAuthenticated: true, isLoading: false });
      await publishIdentity();
    } catch {
      await AsyncStorage.removeItem("session_token");
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUsername: async (username) => {
    const res = await authApi.setUsername(username);
    set({ user: res.user });
  },
}));
