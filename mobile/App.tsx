import React, { useEffect } from "react";
import { Appearance } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { install } from "react-native-quick-crypto";
import { registerGlobals } from "react-native-webrtc";
import AppNavigator from "./src/navigation";
import { useThemeStore } from "./src/stores/theme-store";

// Patches global.crypto / global.Buffer. Must run before any e2ee code.
install();
// Patches global RTCPeerConnection, mediaDevices, MediaStream, etc.
registerGlobals();

export default function App() {
  const mode = useThemeStore((s) => s.mode);
  const hydrate = useThemeStore((s) => s.hydrate);
  const syncSystemMode = useThemeStore((s) => s.syncSystemMode);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Only has an effect while the appearance preference is "system".
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) =>
      syncSystemMode(colorScheme === "light" ? "light" : "dark")
    );
    return () => subscription.remove();
  }, [syncSystemMode]);

  return (
    <SafeAreaProvider>
      <StatusBar style={mode === "light" ? "dark" : "light"} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
