import { api } from "./client";
import type { User } from "../types";

export const usersApi = {
  search: (query: string) =>
    api.get<{ users: User[] }>(`/api/users?q=${encodeURIComponent(query)}`),

  getSettings: () => api.get<{ user: User }>("/api/user/settings"),

  updateSettings: (data: Partial<Pick<User, "displayName" | "bio" | "phone" | "avatarUrl" | "privacyShowStatus" | "privacyShowLastSeen" | "privacyReadReceipts">>) =>
    api.put<{ user: User }>("/api/user/settings", data),
};