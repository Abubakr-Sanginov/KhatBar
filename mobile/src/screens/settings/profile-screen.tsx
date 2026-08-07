import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withSpring, Pressable } from "react-native-reanimated";
import { useAuthStore } from "../../stores/auth-store";
import { usersApi } from "../../api/users";
import { useThemeColors, useThemedStyles } from "../../hooks/use-theme";
import type { ThemeColors } from "../../theme/colors";

export default function ProfileScreen({ navigation }: any) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const colors = useThemeColors();
  const styles = useThemedStyles(makeStyles);

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [username, setUsername] = useState(user?.username || "");
  const [saving, setSaving] = useState(false);

  const buttonScale = useSharedValue(1);
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await usersApi.updateSettings({
        displayName: displayName || undefined,
        bio: bio || undefined,
        phone: phone || undefined,
      });
      setUser(updated.user);
      Alert.alert("Saved", "Profile updated successfully");
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not save");
    }
    setSaving(false);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.header}>
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.avatarSection}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>
            {user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "?"}
          </Text>
        </View>
        <TouchableOpacity>
          <Text style={styles.changePhoto}>Change Photo</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.form}>
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Display name"
          placeholderTextColor={colors.muted}
        />

        <Text style={styles.label}>Username</Text>
        <View style={styles.usernameRow}>
          <Text style={styles.atSign}>@</Text>
          <TextInput
            style={styles.usernameInput}
            value={username}
            onChangeText={(t) => setUsername(t.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
            placeholder="username"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            editable={!user?.username}
          />
        </View>
        {user?.username && (
          <Text style={styles.hint}>Username cannot be changed</Text>
        )}

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="About you..."
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 234 567 890"
          placeholderTextColor={colors.muted}
          keyboardType="phone-pad"
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(400).duration(400)}>
        <Pressable
          onPressIn={() => { buttonScale.value = withSpring(0.96); }}
          onPressOut={() => { buttonScale.value = withSpring(1); }}
          onPress={handleSave}
          disabled={saving}
        >
          <Animated.View
            style={[
              styles.saveButton,
              saving && styles.saveButtonDisabled,
              buttonAnimatedStyle,
            ]}
          >
            {saving ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.saveText}>Save Changes</Text>
            )}
          </Animated.View>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 12,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.text,
    },
    avatarSection: {
      alignItems: "center",
      paddingVertical: 20,
    },
    avatarLarge: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    avatarText: {
      color: colors.onPrimary,
      fontSize: 40,
      fontWeight: "bold",
    },
    changePhoto: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: "500",
    },
    form: {
      paddingHorizontal: 20,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6,
      marginTop: 16,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: "top",
    },
    usernameRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      paddingHorizontal: 12,
    },
    atSign: {
      fontSize: 16,
      color: colors.muted,
    },
    usernameInput: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      marginLeft: 4,
    },
    hint: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 4,
    },
    saveButton: {
      marginHorizontal: 20,
      marginTop: 32,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginBottom: 40,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
  });
