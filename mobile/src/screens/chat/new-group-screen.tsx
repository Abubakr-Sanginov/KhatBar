import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useChatStore } from "../../stores/chat-store";
import { usersApi } from "../../api/users";
import { useThemeColors, useThemedStyles } from "../../hooks/use-theme";
import type { ThemeColors } from "../../theme/colors";
import { getInitials, displayName } from "../../lib/utils";
import type { User } from "../../types";

export default function NewGroupScreen({ navigation }: any) {
  const [groupName, setGroupName] = useState("");
  const [username, setUsername] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { createChat } = useChatStore();
  const colors = useThemeColors();
  const styles = useThemedStyles(makeStyles);

  const handleSearch = async (query: string) => {
    setSearch(query);
    if (query.length < 2) {
      setUsers([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await usersApi.search(query);
      setUsers(
        res.users.filter(
          (u) => !selectedUsers.some((s) => s.id === u.id)
        )
      );
    } catch {}
    setIsSearching(false);
  };

  const toggleUser = useCallback(
    (user: User) => {
      setSelectedUsers((prev) => {
        if (prev.some((u) => u.id === user.id)) {
          return prev.filter((u) => u.id !== user.id);
        }
        return [...prev, user];
      });
    },
    []
  );

  const handleCreate = async () => {
    if (!groupName.trim()) {
      Alert.alert("Error", "Enter a group name");
      return;
    }
    setIsCreating(true);
    try {
      const chat = await createChat({
        type: "GROUP",
        name: groupName.trim(),
        username: username.trim() || undefined,
        isPublic,
        memberIds: selectedUsers.map((u) => u.id),
      });
      navigation.navigate("Chat", {
        chatId: chat.id,
        chatName: chat.name,
      });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not create group");
    }
    setIsCreating(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <TextInput
          style={styles.input}
          placeholder="Group name"
          placeholderTextColor={colors.muted}
          value={groupName}
          onChangeText={setGroupName}
        />

        {isPublic && (
          <View style={styles.usernameRow}>
            <Text style={styles.atSign}>@</Text>
            <TextInput
              style={styles.usernameInput}
              placeholder="username (optional)"
              placeholderTextColor={colors.muted}
              value={username}
              onChangeText={(t) => setUsername(t.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
              autoCapitalize="none"
            />
          </View>
        )}

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Public group</Text>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: colors.muted, true: colors.primary }}
          />
        </View>
      </View>

      {selectedUsers.length > 0 && (
        <View style={styles.selectedSection}>
          <FlatList
            horizontal
            data={selectedUsers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.selectedChip}
                onPress={() => toggleUser(item)}
              >
                <Text style={styles.selectedChipText}>
                  {displayName(item)} ×
                </Text>
              </TouchableOpacity>
            )}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Add members..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isSelected = selectedUsers.some((u) => u.id === item.id);
          return (
            <TouchableOpacity
              style={[styles.userItem, isSelected && styles.userItemSelected]}
              onPress={() => toggleUser(item)}
            >
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {getInitials(displayName(item))}
                </Text>
              </View>
              <Text style={styles.userName}>{displayName(item)}</Text>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          isSearching ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
          ) : null
        }
      />

      <TouchableOpacity
        style={[styles.createButton, (!groupName.trim() || isCreating) && styles.createButtonDisabled]}
        onPress={handleCreate}
        disabled={!groupName.trim() || isCreating}
      >
        {isCreating ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.createButtonText}>Create Group</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerSection: {
      padding: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      marginBottom: 12,
    },
    usernameRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      paddingHorizontal: 12,
      marginBottom: 12,
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
    toggleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    toggleLabel: {
      color: colors.text,
      fontSize: 15,
    },
    selectedSection: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      maxHeight: 60,
    },
    selectedChip: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginRight: 8,
    },
    selectedChipText: {
      color: colors.onPrimary,
      fontSize: 13,
      fontWeight: "500",
    },
    searchContainer: {
      padding: 12,
    },
    searchInput: {
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
    },
    userItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    userItemSelected: {
      backgroundColor: colors.selection,
    },
    userAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    userAvatarText: {
      color: colors.onPrimary,
      fontSize: 14,
      fontWeight: "600",
    },
    userName: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    checkmark: {
      color: colors.primary,
      fontSize: 18,
      fontWeight: "bold",
    },
    createButton: {
      backgroundColor: colors.primary,
      marginHorizontal: 16,
      marginVertical: 12,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    createButtonDisabled: {
      opacity: 0.4,
    },
    createButtonText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
  });
