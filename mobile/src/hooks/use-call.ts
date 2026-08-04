import { useEffect, useCallback } from "react";
import { useCallStore } from "../stores/call-store";
import { useSocket } from "./use-socket";
import type { CallMode } from "../types/call";

export function useCall() {
  const {
    phase,
    callId,
    chatId,
    mode,
    isMicOn,
    isCameraOn,
    isScreenSharing,
    localStream,
    setLocalStream,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    setMinimized,
    setError,
    reset,
  } = useCallStore();

  const {
    sendCallInvite,
    sendCallAccept,
    sendCallDecline,
    sendCallEnd,
    sendCallSignal,
    sendMediaState,
  } = useSocket();

  const acquireStream = useCallback(
    async (callMode: CallMode): Promise<MediaStream | null> => {
      try {
        const constraints: MediaStreamConstraints = {
          audio: true,
          video: callMode === "video",
        };
        // On React Native, this would use react-native-webrtc
        // For now, we use the browser API as a fallback
        if (typeof navigator !== "undefined" && navigator.mediaDevices) {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          return stream;
        }
        return null;
      } catch (err) {
        console.error("Failed to acquire stream:", err);
        setError("Could not access camera/microphone");
        return null;
      }
    },
    [setError]
  );

  const startCall = useCallback(
    async (chatIdParam: string, chatName: string, callMode: CallMode, isGroup: boolean) => {
      const callIdParam = `call_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      const stream = await acquireStream(callMode);
      if (stream) {
        setLocalStream(stream);
      }

      useCallStore.getState().startOutgoing({
        callId: callIdParam,
        chatId: chatIdParam,
        chatName,
        mode: callMode,
        isGroup,
        invitees: [],
      });

      sendCallInvite({
        callId: callIdParam,
        chatId: chatIdParam,
        mode: callMode,
        isGroup,
      });
    },
    [acquireStream, setLocalStream, sendCallInvite]
  );

  const acceptCall = useCallback(async () => {
    const currentCallId = useCallStore.getState().callId;
    const currentMode = useCallStore.getState().mode;

    const stream = await acquireStream(currentMode);
    if (stream) {
      setLocalStream(stream);
    }

    useCallStore.getState().acceptCall();
    sendCallAccept({ callId: currentCallId! });
  }, [acquireStream, setLocalStream, sendCallAccept]);

  const declineCall = useCallback(() => {
    const currentCallId = useCallStore.getState().callId;
    sendCallDecline({ callId: currentCallId! });
    reset();
  }, [sendCallDecline, reset]);

  const hangUp = useCallback(() => {
    const currentCallId = useCallStore.getState().callId;
    if (currentCallId) {
      sendCallEnd({ callId: currentCallId });
    }
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    reset();
  }, [sendCallEnd, localStream, setLocalStream, reset]);

  const toggleMicAction = useCallback(() => {
    toggleMic();
    const currentCallId = useCallStore.getState().callId;
    const isMicOnNow = useCallStore.getState().isMicOn;
    sendMediaState({ callId: currentCallId!, isMuted: !isMicOnNow });
  }, [toggleMic, sendMediaState]);

  const toggleCameraAction = useCallback(() => {
    toggleCamera();
    const currentCallId = useCallStore.getState().callId;
    const isCameraOnNow = useCallStore.getState().isCameraOn;
    sendMediaState({ callId: currentCallId!, isCameraOff: !isCameraOnNow });
  }, [toggleCamera, sendMediaState]);

  const toggleScreenShareAction = useCallback(() => {
    toggleScreenShare();
    const currentCallId = useCallStore.getState().callId;
    const isScreenSharingNow = useCallStore.getState().isScreenSharing;
    sendMediaState({ callId: currentCallId!, isScreenSharing: isScreenSharingNow });
  }, [toggleScreenShare, sendMediaState]);

  return {
    phase,
    callId,
    chatId,
    mode,
    isMicOn,
    isCameraOn,
    isScreenSharing,
    localStream,
    startCall,
    acceptCall,
    declineCall,
    hangUp,
    toggleMic: toggleMicAction,
    toggleCamera: toggleCameraAction,
    toggleScreenShare: toggleScreenShareAction,
    setMinimized,
  };
}
