import { useEffect, useRef, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSocket, disconnectSocket, getSocketInstance } from "../socket/socket";
import { useAuthStore } from "../stores/auth-store";
import { useChatStore } from "../stores/chat-store";
import { useMessageStore } from "../stores/message-store";
import { normalizeIncomingMessage } from "../lib/e2ee";

export function useSocket() {
  const user = useAuthStore((s) => s.user);
  const updateChatInList = useChatStore((s) => s.updateChatInList);
  const connectedRef = useRef(false);
  const typingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
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
        const chatState = useChatStore.getState();
        const chat = chatState.chats.find((item) => item.id === message.chatId)
          ?? (chatState.activeChat?.id === message.chatId ? chatState.activeChat : undefined);
        void normalizeIncomingMessage(chat, useAuthStore.getState().user?.id, message).then((normalized) => {
          chatState.addMessageToChat(message.chatId, normalized);
          useMessageStore.getState().addMessage(message.chatId, normalized);
        });
      });

      socket.on("message:deleted", (data: { messageId: string }) => {
        useMessageStore.getState().removeMessage(data.messageId);
      });

      socket.on("chat:updated", (chat: any) => {
        updateChatInList(chat.id, chat);
      });

      socket.on("chat:deleted", (data: { chatId: string; hard: boolean }) => {
        void useChatStore.getState().deleteChat(data.chatId).catch(() => {});
        useMessageStore.getState().clearChat(data.chatId);
      });

      socket.on("typing", (data: { chatId: string; userId: string; isTyping: boolean }) => {
        const chatState = useChatStore.getState();
        if (data.isTyping && data.userId !== user?.id) {
          chatState.setTypingUser(data.chatId, data.userId);
          const existing = typingTimersRef.current.get(`${data.chatId}:${data.userId}`);
          if (existing) clearTimeout(existing);
          typingTimersRef.current.set(
            `${data.chatId}:${data.userId}`,
            setTimeout(() => {
              chatState.clearTypingUser(data.chatId, data.userId);
              typingTimersRef.current.delete(`${data.chatId}:${data.userId}`);
            }, 3000)
          );
        } else {
          chatState.clearTypingUser(data.chatId, data.userId);
          const existing = typingTimersRef.current.get(`${data.chatId}:${data.userId}`);
          if (existing) {
            clearTimeout(existing);
            typingTimersRef.current.delete(`${data.chatId}:${data.userId}`);
          }
        }
      });

      socket.on("presence:update", (data: { userId: string; status: string }) => {
        const chatState = useChatStore.getState();
        chatState.updateMemberPresence(data.userId, data.status as any);
      });

      connectedRef.current = true;
    }

    connect();

    return () => {
      mounted = false;
      typingTimersRef.current.forEach((timer) => clearTimeout(timer));
      typingTimersRef.current.clear();
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
      targetIds: string[];
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
    (data: { callId: string; targetId: string; payload: any }) =>
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

  const on = useCallback(
    (event: string, handler: (...args: any[]) => void) => {
      const socket = getSocketInstance();
      if (!socket) return () => {};
      socket.on(event, handler);
      return () => {
        socket.off(event, handler);
      };
    },
    []
  );

  return useMemo(() => ({
    emit,
    on,
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
  }), []);
}
