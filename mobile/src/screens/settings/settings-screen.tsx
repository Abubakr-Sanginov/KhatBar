import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useAuthStore } from "../../stores/auth-store";
import { usersApi } from "../../api/users";
import { useThemeStore, type ModePreference } from "../../stores/theme-store";
import { useThemeColors, useThemedStyles } from "../../hooks/use-theme";
import { SKIN_LIST } from "../../theme/skins";
import type { ThemeColors } from "../../theme/colors";

const MODES: { id: ModePreference; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

function InterfacePicker() {
  const styles = useThemedStyles(makeStyles);
  const skin = useThemeStore((s) => s.skin);
  const setSkin = useThemeStore((s) => s.setSkin);

  return (
    <View style={styles.skinList}>
      {SKIN_LIST.map((option) => {
        const isActive = option.id === skin;
        return (
          <TouchableOpacity
            key={option.id}
            style={[styles.skinCard, isActive && styles.skinCardActive]}
            onPress={() => setSkin(option.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            activeOpacity={0.8}
          >
            <View style={styles.swatchRow}>
              {option.swatches.map((color) => (
                <View
                  key={color}
                  style={[styles.swatch, { backgroundColor: color }]}
                />
              ))}
            </View>
            <View style={styles.skinInfo}>
              <View style={styles.skinTitleRow}>
                <Text style={styles.skinName}>{option.name}</Text>
                {isActive && <Text style={styles.skinCheck}>✓</Text>}
              </View>
              <Text style={styles.skinTagline}>{option.tagline}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ModePicker() {
  const styles = useThemedStyles(makeStyles);
  const modePreference = useThemeStore((s) => s.modePreference);
  const setModePreference = useThemeStore((s) => s.setModePreference);

  return (
    <View style={styles.modeRow}>
      {MODES.map((mode) => {
        const isActive = mode.id === modePreference;
        return (
          <TouchableOpacity
            key={mode.id}
            style={[styles.modeButton, isActive && styles.modeButtonActive]}
            onPress={() => setModePreference(mode.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeLabel, isActive && styles.modeLabelActive]}>
              {mode.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function SettingsScreen({ navigation }: any) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const colors = useThemeColors();
  const styles = useThemedStyles(makeStyles);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => navigation.navigate("Profile")}
        >
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>
              {user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "?"}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.displayName || "Set display name"}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            {user?.username && (
              <Text style={styles.profileUsername}>@{user.username}</Text>
            )}
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.section}>
        <Text style={styles.sectionTitle}>Interface</Text>
        <InterfacePicker />
        <Text style={styles.sectionHint}>
          Applies to this device instantly. Both interfaces share the same features.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <ModePicker />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy</Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Show Online Status</Text>
          <Switch
            value={user?.privacyShowStatus ?? true}
            onValueChange={async (val) => {
              try {
                const updated = await usersApi.updateSettings({ privacyShowStatus: val });
                useAuthStore.getState().setUser(updated.user);
              } catch {}
            }}
            trackColor={{ false: colors.muted, true: colors.primary }}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Show Last Seen</Text>
          <Switch
            value={user?.privacyShowLastSeen ?? true}
            onValueChange={async (val) => {
              try {
                const updated = await usersApi.updateSettings({ privacyShowLastSeen: val });
                useAuthStore.getState().setUser(updated.user);
              } catch {}
            }}
            trackColor={{ false: colors.muted, true: colors.primary }}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Read Receipts</Text>
          <Switch
            value={user?.privacyReadReceipts ?? true}
            onValueChange={async (val) => {
              try {
                const updated = await usersApi.updateSettings({ privacyReadReceipts: val });
                useAuthStore.getState().setUser(updated.user);
              } catch {}
            }}
            trackColor={{ false: colors.muted, true: colors.primary }}
          />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(600).duration(400)} style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate("Profile")}
        >
          <Text style={styles.menuLabel}>Edit Profile</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuLabel}>Notifications</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuLabel}>Storage & Data</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(700).duration(400)}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </Animated.View>

      <Text style={styles.version}>KhatBar v1.0.0</Text>
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
      fontSize: 32,
      fontWeight: "bold",
      color: colors.text,
    },
    profileCard: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: colors.card,
      borderRadius: 16,
    },
    avatarLarge: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    avatarText: {
      color: colors.onPrimary,
      fontSize: 24,
      fontWeight: "bold",
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.text,
    },
    profileEmail: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    profileUsername: {
      fontSize: 14,
      color: colors.primary,
      marginTop: 2,
    },
    chevron: {
      color: colors.muted,
      fontSize: 22,
    },
    section: {
      marginTop: 24,
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
      marginLeft: 4,
    },
    sectionHint: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 8,
      marginLeft: 4,
    },
    skinList: {
      gap: 10,
    },
    skinCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    skinCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    swatchRow: {
      flexDirection: "row",
      marginRight: 12,
    },
    swatch: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      marginRight: -6,
    },
    skinInfo: {
      flex: 1,
    },
    skinTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    skinName: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    skinCheck: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: "bold",
      marginLeft: 8,
    },
    skinTagline: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    modeRow: {
      flexDirection: "row",
      gap: 8,
    },
    modeButton: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 12,
      alignItems: "center",
    },
    modeButtonActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    modeLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    modeLabelActive: {
      color: colors.primary,
      fontWeight: "600",
    },
    settingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.card,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    settingLabel: {
      fontSize: 15,
      color: colors.text,
    },
    menuItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.card,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    menuLabel: {
      fontSize: 15,
      color: colors.text,
    },
    logoutButton: {
      marginHorizontal: 16,
      marginTop: 32,
      backgroundColor: colors.destructive,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    logoutText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "600",
    },
    version: {
      textAlign: "center",
      color: colors.muted,
      fontSize: 13,
      marginTop: 20,
      marginBottom: 40,
    },
  });
