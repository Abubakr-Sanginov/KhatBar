import { api } from "./client";
import type { User, ApiResponse } from "../types";

interface LoginResponse {
  user: User;
  token: string;
}

interface RegisterResponse {
  user: User;
  token: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>("/api/auth/login", { email, password }),

  register: (email: string, password: string, username?: string) =>
    api.post<RegisterResponse>("/api/auth/register", { email, password, username }),

  getSession: () => api.get<{ user: User }>("/api/auth/session"),

  logout: () => api.post("/api/auth/logout"),

  setUsername: (username: string) =>
    api.post<{ user: User }>("/api/auth/username", { username }),

  uploadKey: (publicKey: string) =>
    api.put("/api/keys", { publicKey }),
};