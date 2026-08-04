import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export const uploadApi = {
  async uploadFile(uri: string, filename: string, mimeType: string): Promise<{ url: string; width?: number; height?: number; duration?: number }> {
    const token = await AsyncStorage.getItem("session_token");
    
    const formData = new FormData();
    formData.append("file", {
      uri,
      name: filename,
      type: mimeType,
    } as unknown as Blob);

    const res = await fetch(`${API_BASE}/api/upload`, {
      method: "POST",
      headers: {
        Cookie: token ? `session_token=${token}` : "",
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Upload failed");
    }

    return res.json();
  },

  async uploadVoice(uri: string, duration: number): Promise<{ url: string }> {
    return this.uploadFile(uri, `voice-${Date.now()}.m4a`, "audio/m4a");
  },
};