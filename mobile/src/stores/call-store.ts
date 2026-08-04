import { create } from "zustand";
import type { CallParticipant, CallMode, IncomingCallInfo, OutgoingCallInfo } from "../types/call";

type CallPhase = "idle" | "outgoing" | "incoming" | "active";

interface CallState {
  phase: CallPhase;
  callId: string | null;
  chatId: string | null;
  chatName: string | null;
  mode: CallMode;
  isGroup: boolean;
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isMinimized: boolean;
  participants: Record<string, CallParticipant>;
  localStream: MediaStream | null;
  answeredAt: number | null;
  error: string | null;
  incoming: IncomingCallInfo | null;
}

interface CallActions {
  startOutgoing: (info: OutgoingCallInfo) => void;
  receiveIncoming: (info: IncomingCallInfo) => void;
  acceptCall: () => void;
  declineCall: () => void;
  hangUp: () => void;
  setLocalStream: (stream: MediaStream | null) => void;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  setMinimized: (minimized: boolean) => void;
  setError: (error: string | null) => void;
  setParticipant: (id: string, data: Partial<CallParticipant>) => void;
  removeParticipant: (id: string) => void;
  reset: () => void;
}

const initialState: CallState = {
  phase: "idle",
  callId: null,
  chatId: null,
  chatName: null,
  mode: "voice",
  isGroup: false,
  isMicOn: true,
  isCameraOn: false,
  isScreenSharing: false,
  isMinimized: false,
  participants: {},
  localStream: null,
  answeredAt: null,
  error: null,
  incoming: null,
};

function toParticipant(
  raw: Partial<CallParticipant> & { id: string },
  extra?: Partial<CallParticipant>
): CallParticipant {
  return {
    id: raw.id,
    displayName: raw.displayName ?? null,
    username: raw.username ?? null,
    avatarUrl: raw.avatarUrl ?? null,
    isMuted: raw.isMuted ?? false,
    isCameraOff: raw.isCameraOff ?? true,
    isScreenSharing: raw.isScreenSharing ?? false,
    connection: raw.connection ?? "new",
    stream: raw.stream,
    isRinging: raw.isRinging ?? false,
    ...extra,
  };
}

export const useCallStore = create<CallState & CallActions>((set) => ({
  ...initialState,

  startOutgoing: ({ callId, chatId, chatName, mode, isGroup, invitees }) =>
    set({
      ...initialState,
      phase: "outgoing",
      callId,
      chatId,
      chatName,
      mode,
      isGroup,
      isMicOn: true,
      isCameraOn: mode === "video",
      isMinimized: mode === "voice",
      participants: Object.fromEntries(
        invitees.map((p) => [p.id, toParticipant(p)])
      ),
    }),

  receiveIncoming: (info) =>
    set({
      ...initialState,
      phase: "incoming",
      callId: info.callId,
      chatId: info.chatId,
      chatName: info.chatName,
      mode: info.mode,
      isGroup: info.isGroup,
      incoming: info,
      isMicOn: true,
      isCameraOn: info.mode === "video",
      isMinimized: info.mode === "voice",
      participants: {
        [info.caller.id]: toParticipant(info.caller, { isRinging: false }),
      },
    }),

  acceptCall: () =>
    set({ phase: "active", answeredAt: Date.now(), isCameraOn: false }),

  declineCall: () => {
    set({ phase: "idle" });
  },

  hangUp: () => {
    set({ phase: "idle" });
  },

  setLocalStream: (stream) => set({ localStream: stream }),

  toggleMic: () =>
    set((s) => {
      const newMic = !s.isMicOn;
      s.localStream?.getAudioTracks().forEach((t) => {
        t.enabled = newMic;
      });
      return { isMicOn: newMic };
    }),

  toggleCamera: () =>
    set((s) => {
      const newCam = !s.isCameraOn;
      s.localStream?.getVideoTracks().forEach((t) => {
        t.enabled = newCam;
      });
      return { isCameraOn: newCam };
    }),

  toggleScreenShare: () =>
    set((s) => ({ isScreenSharing: !s.isScreenSharing })),

  setMinimized: (minimized) => set({ isMinimized: minimized }),

  setError: (error) => set({ error }),

  setParticipant: (id, data) =>
    set((s) => ({
      participants: {
        ...s.participants,
        [id]: { ...(s.participants[id] || { id } as CallParticipant), ...data },
      },
    })),

  removeParticipant: (id) =>
    set((s) => {
      const copy = { ...s.participants };
      delete copy[id];
      return { participants: copy };
    }),

  reset: () => set(initialState),
}));
