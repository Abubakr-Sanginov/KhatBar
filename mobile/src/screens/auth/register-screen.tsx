import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
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
  autoCapitalize,
  colors,
  delay,
}: {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoComplete?: string;
  autoCapitalize?: any;
  colors: ThemeColors;
  delay: number;
}) {
  const [focused, setFocused] = useState(false);
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
        autoCapitalize={autoCapitalize}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </Animated.View>
  );
}

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const colors = useThemeColors();

  const buttonScale = useSharedValue(1);
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      await register(email, password, displayName || undefined);
    } catch (err: any) {
      Alert.alert("Registration Failed", err.message || "Could not create account");
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
          <Text style={[authStyles.title, { color: colors.text }]}>Create Account</Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[authStyles.subtitle, { color: colors.textSecondary }]}>Join KhatBar today</Text>
        </Animated.View>

        <View style={{ gap: 12, marginTop: 32 }}>
          <AnimatedInput
            placeholder="Display Name"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            colors={colors}
            delay={300}
          />
          <AnimatedInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoComplete="email"
            colors={colors}
            delay={400}
          />
          <AnimatedInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password-new"
            colors={colors}
            delay={500}
          />
        </View>

        <Animated.View entering={FadeInUp.delay(600).duration(400)}>
          <Pressable
            onPressIn={() => { buttonScale.value = withSpring(0.96); }}
            onPressOut={() => { buttonScale.value = withSpring(1); }}
            onPress={handleRegister}
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
                <Text style={[authStyles.buttonText, { color: colors.onPrimary }]}>Create Account</Text>
              )}
            </Animated.View>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(700).duration(400)}>
          <Pressable style={authStyles.linkButton} onPress={() => navigation.goBack()}>
            <Text style={[authStyles.linkText, { color: colors.textSecondary }]}>
              Already have an account? <Text style={[authStyles.linkBold, { color: colors.primary }]}>Sign In</Text>
            </Text>
          </Pressable>
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
