import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { install } from "react-native-quick-crypto";
import { registerGlobals } from "react-native-webrtc";
import AppNavigator from "./src/navigation";

// Patches global.crypto / global.Buffer. Must run before any e2ee code.
install();
// Patches global RTCPeerConnection, mediaDevices, MediaStream, etc.
registerGlobals();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
