import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useMessageStore } from "../../stores/message-store";
import { useChatStore } from "../../stores/chat-store";
import { useAuthStore } from "../../stores/auth-store";
import { useSocket } from "../../hooks/use-socket";
import { useThemeColors, useThemedStyles } from "../../hooks/use-theme";
import type { ThemeColors } from "../../theme/colors";
import { formatMessageTime, displayName } from "../../lib/utils";
import type { Message } from "../../types";

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const styles = useThemedStyles(makeStyles);

  if (message.type === "SYSTEM") {
    return (
      <View style={styles.systemMessage}>
        <Text style={styles.systemText}>{message.content}</Text>
      </View>
    );
  }

  const textStyle = isOwn ? styles.ownText : styles.otherText;
  const timeStyle = isOwn ? styles.ownTime : styles.otherTime;

  if (message.isDeleted) {
    return (
      <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
        <Text style={styles.deletedText}>Message deleted</Text>
      </View>
    );
  }

  return (
    <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
      {message.type === "IMAGE" && (
        <Text style={[styles.mediaText, textStyle]}>📷 Photo</Text>
      )}
      {message.type === "VIDEO" && (
        <Text style={[styles.mediaText, textStyle]}>🎬 Video</Text>
      )}
      {message.type === "AUDIO" && (
        <Text style={[styles.mediaText, textStyle]}>🎤 Voice message</Text>
      )}
      {message.type === "FILE" && (
        <Text style={[styles.mediaText, textStyle]}>📎 File</Text>
      )}
      {message.type === "STICKER" && (
        <Text style={[styles.mediaText, textStyle]}>Sticker</Text>
      )}
      {message.type === "GIF" && (
        <Text style={[styles.mediaText, textStyle]}>GIF</Text>
      )}
      {(message.type === "TEXT" || message.type === "CALL") && (
        <Text style={[styles.messageText, textStyle]}>{message.content}</Text>
      )}
      <Text style={[styles.messageTime, timeStyle]}>{formatMessageTime(message.createdAt)}</Text>
    </View>
  );
}

export default function ChatScreen({ route, navigation }: any) {
  const { chatId, chatName } = route.params;
  const user = useAuthStore((s) => s.user);
  const colors = useThemeColors();
  const styles = useThemedStyles(makeStyles);
  const { messagesByChat, isLoadingByChat, hasMoreByChat, loadMessages, loadMore } = useMessageStore();
  const chatMessages = messagesByChat[chatId] || [];
  const isLoading = isLoadingByChat[chatId];
  const hasMore = hasMoreByChat[chatId];
  const { joinChat, leaveChat, sendMessage, markRead, sendTyping } = useSocket();
  const deleteChat = useChatStore((s) => s.deleteChat);
  const [input, setInput] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            Alert.alert("Delete chat", "Delete this conversation?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                  void deleteChat(chatId)
                    .then(() => navigation.goBack())
                    .catch((err: any) => Alert.alert("Error", err.message || "Could not delete chat"));
                },
              },
            ]);
          }}
          style={{ paddingHorizontal: 16, paddingVertical: 4 }}
        >
          <Text style={{ color: colors.destructive, fontSize: 16 }}>Delete</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, chatId, deleteChat, colors]);

  useEffect(() => {
    loadMessages(chatId);
    joinChat(chatId);
    markRead(chatId);

    return () => {
      leaveChat(chatId);
    };
  }, [chatId]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInput("");
    try {
      sendMessage({ chatId, content: text, type: "TEXT" });
    } catch {}
    setIsSending(false);
  }, [input, chatId, isSending, sendMessage]);

  const handleTyping = useCallback(
    (text: string) => {
      setInput(text);
      if (text.length > 0) {
        sendTyping(chatId, true);
      } else {
        sendTyping(chatId, false);
      }
    },
    [chatId, sendTyping]
  );

  const renderItem = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble message={item} isOwn={item.senderId === user?.id} />
    ),
    [user?.id]
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={chatMessages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        inverted
        contentContainerStyle={styles.messagesList}
        ListFooterComponent={
          isLoading ? (
            <ActivityIndicator style={{ padding: 16 }} color={colors.primary} />
          ) : hasMore ? (
            <TouchableOpacity
              style={styles.loadMore}
              onPress={() => loadMore(chatId)}
            >
              <Text style={styles.loadMoreText}>Load older messages</Text>
            </TouchableOpacity>
          ) : null
        }
        onEndReached={() => {}}
        onEndReachedThreshold={0.5}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Message..."
          placeholderTextColor={colors.muted}
          value={input}
          onChangeText={handleTyping}
          multiline
          maxLength={4000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || isSending}
        >
          <Text style={styles.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    messagesList: {
      paddingHorizontal: 12,
      paddingTop: 8,
    },
    messageBubble: {
      maxWidth: "78%",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 18,
      marginVertical: 3,
    },
    ownBubble: {
      backgroundColor: colors.primary,
      alignSelf: "flex-end",
      borderBottomRightRadius: 4,
    },
    otherBubble: {
      backgroundColor: colors.card,
      alignSelf: "flex-start",
      borderBottomLeftRadius: 4,
    },
    systemMessage: {
      alignItems: "center",
      paddingVertical: 8,
    },
    systemText: {
      color: colors.muted,
      fontSize: 13,
      fontStyle: "italic",
    },
    messageText: {
      fontSize: 15,
      lineHeight: 20,
    },
    mediaText: {
      fontSize: 14,
    },
    // The outgoing bubble is a primary fill, so its text takes the accent's
    // foreground rather than the page text colour.
    ownText: {
      color: colors.onPrimary,
    },
    otherText: {
      color: colors.text,
    },
    deletedText: {
      color: colors.muted,
      fontSize: 14,
      fontStyle: "italic",
    },
    messageTime: {
      fontSize: 11,
      marginTop: 4,
      alignSelf: "flex-end",
    },
    ownTime: {
      color: colors.onPrimary,
      opacity: 0.65,
    },
    otherTime: {
      color: colors.textSecondary,
    },
    loadMore: {
      alignItems: "center",
      paddingVertical: 12,
    },
    loadMoreText: {
      color: colors.primary,
      fontSize: 14,
    },
    inputBar: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: 12,
      paddingVertical: 8,
      paddingBottom: Platform.OS === "ios" ? 24 : 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    textInput: {
      flex: 1,
      backgroundColor: colors.inputBg,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
      maxHeight: 100,
      marginRight: 8,
    },
    sendButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    sendButtonDisabled: {
      opacity: 0.4,
    },
    sendIcon: {
      color: colors.onPrimary,
      fontSize: 18,
      fontWeight: "bold",
    },
  });
