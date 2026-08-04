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
import { useAuthStore } from "../../stores/auth-store";
import { usersApi } from "../../api/users";
import { Colors } from "../../theme/colors";

export default function ProfileScreen({ navigation }: any) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [username, setUsername] = useState(user?.username || "");
  const [saving, setSaving] = useState(false);

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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </View>

      <View style={styles.avatarSection}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>
            {user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "?"}
          </Text>
        </View>
        <TouchableOpacity>
          <Text style={styles.changePhoto}>Change Photo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Display name"
          placeholderTextColor={Colors.dark.muted}
        />

        <Text style={styles.label}>Username</Text>
        <View style={styles.usernameRow}>
          <Text style={styles.atSign}>@</Text>
          <TextInput
            style={styles.usernameInput}
            value={username}
            onChangeText={(t) => setUsername(t.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
            placeholder="username"
            placeholderTextColor={Colors.dark.muted}
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
          placeholderTextColor={Colors.dark.muted}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 234 567 890"
          placeholderTextColor={Colors.dark.muted}
          keyboardType="phone-pad"
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.dark.text,
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 20,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  avatarText: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "bold",
  },
  changePhoto: {
    color: Colors.dark.primary,
    fontSize: 15,
    fontWeight: "500",
  },
  form: {
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: Colors.dark.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.dark.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.inputBg,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  atSign: {
    fontSize: 16,
    color: Colors.dark.muted,
  },
  usernameInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.dark.text,
    marginLeft: 4,
  },
  hint: {
    fontSize: 12,
    color: Colors.dark.muted,
    marginTop: 4,
  },
  saveButton: {
    marginHorizontal: 20,
    marginTop: 32,
    backgroundColor: Colors.dark.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 40,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
