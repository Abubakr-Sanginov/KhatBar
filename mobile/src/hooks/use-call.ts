import { useEffect, useCallback, useRef } from "react";
import { mediaDevices, RTCPeerConnection, RTCIceCandidate, RTCSessionDescription } from "react-native-webrtc";
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
    on,
    sendCallInvite,
    sendCallAccept,
    sendCallDecline,
    sendCallEnd,
    sendCallSignal,
    sendMediaState,
  } = useSocket();
  const peersRef = useRef<Map<string, any>>(new Map());

  const acquireStream = useCallback(
    async (callMode: CallMode): Promise<MediaStream | null> => {
      try {
        const stream = await mediaDevices.getUserMedia({
          audio: true,
          video: callMode === "video" ? { facingMode: "user" } : false,
        });
        return stream as unknown as MediaStream;
      } catch (err) {
        console.error("Failed to acquire stream:", err);
        setError("Could not access camera/microphone");
        return null;
      }
    },
    [setError]
  );

  const startCall = useCallback(
    async (chatIdParam: string, chatName: string, callMode: CallMode, isGroup: boolean, targetIds: string[]) => {
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
        targetIds,
      });
    },
    [acquireStream, setLocalStream, sendCallInvite]
  );

  const createPeer = useCallback(async (peerId: string, shouldOffer: boolean) => {
    const currentCallId = useCallStore.getState().callId;
    if (!currentCallId) return;
    let pc = peersRef.current.get(peerId);
    if (!pc) {
      pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      peersRef.current.set(peerId, pc);
      useCallStore.getState().localStream?.getTracks().forEach((track) => pc.addTrack(track, useCallStore.getState().localStream));
      pc.onicecandidate = (event: any) => {
        if (event.candidate) sendCallSignal({ callId: currentCallId, targetId: peerId, payload: { type: "candidate", candidate: event.candidate } });
      };
      pc.ontrack = (event: any) => {
        useCallStore.getState().setParticipant(peerId, { stream: event.streams[0], connection: "connected" });
      };
    }
    if (shouldOffer) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendCallSignal({ callId: currentCallId, targetId: peerId, payload: { type: "offer", sdp: offer } });
    }
  }, [sendCallSignal]);

  useEffect(() => {
    const cleanups = [
      on("call:invite", (info: any) => useCallStore.getState().receiveIncoming(info)),
      on("call:accepted", ({ callId: acceptedId, peer }: any) => {
        if (acceptedId !== useCallStore.getState().callId) return;
        useCallStore.getState().acceptCall();
        useCallStore.getState().setParticipant(peer.id, { ...peer, connection: "connecting" });
        void createPeer(peer.id, true);
      }),
      on("call:peer-joined", ({ callId: joinedId, peer, initiator }: any) => {
        if (joinedId !== useCallStore.getState().callId) return;
        useCallStore.getState().setParticipant(peer.id, { ...peer, connection: "connecting" });
        void createPeer(peer.id, Boolean(initiator));
      }),
      on("call:signal", async ({ callId: signalId, fromId, payload }: any) => {
        if (signalId !== useCallStore.getState().callId) return;
        await createPeer(fromId, false);
        const pc = peersRef.current.get(fromId);
        if (!pc) return;
        if (payload.type === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendCallSignal({ callId: signalId, targetId: fromId, payload: { type: "answer", sdp: answer } });
        } else if (payload.type === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        } else if (payload.type === "candidate") {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
      }),
      on("call:ended", () => {
        peersRef.current.forEach((pc) => pc.close());
        peersRef.current.clear();
        useCallStore.getState().localStream?.getTracks().forEach((track) => track.stop());
        useCallStore.getState().reset();
      }),
    ];
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [on, createPeer, sendCallSignal]);

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
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
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
