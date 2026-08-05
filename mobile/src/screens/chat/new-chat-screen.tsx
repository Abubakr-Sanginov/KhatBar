import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useChatStore } from "../../stores/chat-store";
import { useAuthStore } from "../../stores/auth-store";
import { usersApi } from "../../api/users";
import { useThemeColors, useThemedStyles } from "../../hooks/use-theme";
import type { ThemeColors } from "../../theme/colors";
import { getInitials, displayName } from "../../lib/utils";
import type { User } from "../../types";

export default function NewChatScreen({ navigation }: any) {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { createChat } = useChatStore();
  const currentUser = useAuthStore((s) => s.user);
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
      setUsers(res.users.filter((u) => u.id !== currentUser?.id));
    } catch {}
    setIsSearching(false);
  };

  const handleSelectUser = async (selected: User) => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const chat = await createChat({
        type: "PRIVATE",
        memberIds: [selected.id],
      });
      navigation.replace("Chat", { chatId: chat.id, chatName: selected.displayName || selected.username });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not create chat");
    }
    setIsCreating(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users by name or email..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoFocus
        />
      </View>

      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => navigation.navigate("NewGroup")}
      >
        <View style={styles.optionIcon}>
          <Text style={styles.optionIconText}>👥</Text>
        </View>
        <Text style={styles.optionText}>Create Group</Text>
      </TouchableOpacity>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.userItem}
            onPress={() => handleSelectUser(item)}
            disabled={isCreating}
          >
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {getInitials(displayName(item))}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{displayName(item)}</Text>
              <Text style={styles.userEmail}>{item.email}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          isSearching ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
          ) : search.length >= 2 ? (
            <Text style={styles.emptyText}>No users found</Text>
          ) : null
        }
      />

      {isCreating && (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.creatingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    searchContainer: {
      padding: 12,
    },
    searchInput: {
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
    },
    optionButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    optionIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    optionIconText: {
      fontSize: 18,
    },
    optionText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: "500",
    },
    userItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    userAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    userAvatarText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: 15,
      fontWeight: "500",
      color: colors.text,
    },
    userEmail: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    emptyText: {
      textAlign: "center",
      color: colors.textSecondary,
      marginTop: 40,
      fontSize: 15,
    },
    creatingOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: "center",
      justifyContent: "center",
    },
  });
