import React, { useEffect } from "react";
import { Appearance, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation";
import { useThemeStore } from "./src/stores/theme-store";

// react-native-quick-crypto and react-native-webrtc require a dev client build,
// not Expo Go. Conditionally install so the app still loads in Expo Go.
if (Platform.OS !== "web") {
  try {
    const { install } = require("react-native-quick-crypto");
    install();
  } catch {}
  try {
    const { registerGlobals } = require("react-native-webrtc");
    registerGlobals();
  } catch {}
}

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
