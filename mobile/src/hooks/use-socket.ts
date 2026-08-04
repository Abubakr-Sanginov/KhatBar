import { useEffect, useRef, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSocket, disconnectSocket, getSocketInstance } from "../socket/socket";
import { useAuthStore } from "../stores/auth-store";
import { useChatStore } from "../stores/chat-store";
import { useMessageStore } from "../stores/message-store";

export function useSocket() {
  const user = useAuthStore((s) => s.user);
  const addMessageToChat = useChatStore((s) => s.addMessageToChat);
  const addMessage = useMessageStore((s) => s.addMessage);
  const updateChatInList = useChatStore((s) => s.updateChatInList);
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!user || connectedRef.current) return;

    let mounted = true;

    async function connect() {
      const socket = await getSocket();
      if (!mounted) return;

      socket.on("connect", () => {
        console.log("[Socket] Connected:", socket.id);
      });

      socket.on("disconnect", () => {
        console.log("[Socket] Disconnected");
      });

      socket.on("message:new", (message: any) => {
        addMessageToChat(message.chatId, message);
        addMessage(message.chatId, message);
      });

      socket.on("message:deleted", (data: { messageId: string }) => {
        useMessageStore.getState().removeMessage(data.messageId);
      });

      socket.on("chat:updated", (chat: any) => {
        updateChatInList(chat.id, chat);
      });

      socket.on("typing", (data: { chatId: string; userId: string; isTyping: boolean }) => {
        // Could be used for typing indicators
      });

      socket.on("presence:update", (data: { userId: string; status: string }) => {
        // Could update user presence in chat members
      });

      connectedRef.current = true;
    }

    connect();

    return () => {
      mounted = false;
      disconnectSocket();
      connectedRef.current = false;
    };
  }, [user?.id]);

  const emit = useCallback(async (event: string, data?: unknown) => {
    const socket = getSocketInstance();
    if (socket?.connected) {
      socket.emit(event, data);
    }
  }, []);

  const joinChat = useCallback(
    (chatId: string) => emit("join:chat", { chatId }),
    [emit]
  );

  const leaveChat = useCallback(
    (chatId: string) => emit("leave:chat", { chatId }),
    [emit]
  );

  const sendTyping = useCallback(
    (chatId: string, isTyping: boolean) =>
      emit("typing", { chatId, isTyping }),
    [emit]
  );

  const sendMessage = useCallback(
    (data: {
      chatId: string;
      content: string;
      type?: string;
      replyToId?: string;
      isEncrypted?: boolean;
    }) => emit("message:send", data),
    [emit]
  );

  const sendCallInvite = useCallback(
    (data: {
      callId: string;
      chatId: string;
      mode: string;
      isGroup: boolean;
    }) => emit("call:invite", data),
    [emit]
  );

  const sendCallAccept = useCallback(
    (data: { callId: string }) => emit("call:accept", data),
    [emit]
  );

  const sendCallDecline = useCallback(
    (data: { callId: string }) => emit("call:decline", data),
    [emit]
  );

  const sendCallEnd = useCallback(
    (data: { callId: string }) => emit("call:end", data),
    [emit]
  );

  const sendCallSignal = useCallback(
    (data: { callId: string; to: string; signal: any }) =>
      emit("call:signal", data),
    [emit]
  );

  const sendMediaState = useCallback(
    (data: {
      callId: string;
      isMuted?: boolean;
      isCameraOff?: boolean;
      isScreenSharing?: boolean;
    }) => emit("call:media-state", data),
    [emit]
  );

  const markRead = useCallback(
    (chatId: string) => emit("chat:read", { chatId }),
    [emit]
  );

  return {
    emit,
    joinChat,
    leaveChat,
    sendTyping,
    sendMessage,
    sendCallInvite,
    sendCallAccept,
    sendCallDecline,
    sendCallEnd,
    sendCallSignal,
    sendMediaState,
    markRead,
  };
}
