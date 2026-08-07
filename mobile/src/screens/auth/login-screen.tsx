import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Pressable,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useAuthStore } from "../../stores/auth-store";
import { useThemeColors } from "../../hooks/use-theme";
import type { ThemeColors } from "../../theme/colors";

function AnimatedInput({
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoComplete,
  colors,
  delay,
}: {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoComplete?: string;
  colors: ThemeColors;
  delay: number;
}) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: focused ? colors.primary : "transparent",
    shadowOpacity: focused ? 0.1 : 0,
  }));

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)}>
      <TextInput
        style={[authStyles.input, { backgroundColor: colors.inputBg, color: colors.text }, animatedStyle]}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </Animated.View>
  );
}

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const colors = useThemeColors();

  const buttonScale = useSharedValue(1);
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      Alert.alert("Login Failed", err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[authStyles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={authStyles.inner}>
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Text style={[authStyles.title, { color: colors.text }]}>KhatBar</Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[authStyles.subtitle, { color: colors.textSecondary }]}>Sign in to continue</Text>
        </Animated.View>

        <View style={{ gap: 12, marginTop: 32 }}>
          <AnimatedInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoComplete="email"
            colors={colors}
            delay={300}
          />
          <AnimatedInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            colors={colors}
            delay={400}
          />
        </View>

        <Animated.View entering={FadeInUp.delay(500).duration(400}>
          <Pressable
            onPressIn={() => { buttonScale.value = withSpring(0.96); }}
            onPressOut={() => { buttonScale.value = withSpring(1); }}
            onPress={handleLogin}
            disabled={loading}
          >
            <Animated.View
              style={[
                authStyles.button,
                { backgroundColor: colors.primary },
                buttonAnimatedStyle,
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={[authStyles.buttonText, { color: colors.onPrimary }]}>Sign In</Text>
              )}
            </Animated.View>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(600).duration(400)}>
          <TouchableOpacity
            style={authStyles.linkButton}
            onPress={() => navigation.navigate("Register")}
          >
            <Text style={[authStyles.linkText, { color: colors.textSecondary }]}>
              Don't have an account? <Text style={[authStyles.linkBold, { color: colors.primary }]}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const authStyles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  title: { fontSize: 36, fontWeight: "bold", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: "center", marginBottom: 40 },
  input: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 8,
    elevation: 0,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonText: { fontSize: 17, fontWeight: "600" },
  linkButton: { marginTop: 20, alignItems: "center" },
  linkText: { fontSize: 14 },
  linkBold: { fontWeight: "600" },
});
