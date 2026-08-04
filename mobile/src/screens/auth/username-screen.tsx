import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuthStore } from "../../stores/auth-store";
import { Colors } from "../../theme/colors";

export default function UsernameScreen() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const setUsernameAction = useAuthStore((s) => s.setUsername);
  const user = useAuthStore((s) => s.user);

  const handleSubmit = async () => {
    if (!username.trim()) {
      Alert.alert("Error", "Please enter a username");
      return;
    }
    setLoading(true);
    try {
      await setUsernameAction(username.trim().toLowerCase());
    } catch (err: any) {
      Alert.alert("Error", err.message || "Username not available");
    } finally {
      setLoading(false);
    }
  };

  if (user?.username) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Choose a Username</Text>
        <Text style={styles.subtitle}>
          This will be your unique identifier on KhatBar
        </Text>

        <View style={styles.inputRow}>
          <Text style={styles.atSign}>@</Text>
          <TextInput
            style={styles.input}
            placeholder="username"
            placeholderTextColor={Colors.dark.muted}
            value={username}
            onChangeText={(t) => setUsername(t.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={loading || !username.trim()}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.dark.text,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    marginBottom: 32,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.inputBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  atSign: {
    fontSize: 18,
    color: Colors.dark.muted,
    marginRight: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.dark.text,
  },
  button: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  skipButton: {
    marginTop: 16,
    alignItems: "center",
  },
  skipText: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
  },
});
