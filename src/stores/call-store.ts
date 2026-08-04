import { create } from "zustand"
import type {
  CallEndReason,
  CallMode,
  CallParticipant,
  CallPeerInfo,
  CallPhase,
  IncomingCallInfo,
} from "@/types/call"

interface CallState {
  phase: CallPhase
  callId: string | null
  chatId: string | null
  chatName: string
  mode: CallMode
  isGroup: boolean
  /** Set when we are the callee and the call has not been answered yet. */
  incoming: IncomingCallInfo | null
  localStream: MediaStream | null
  participants: Record<string, CallParticipant>
  isMicOn: boolean
  isCameraOn: boolean
  isScreenSharing: boolean
  isMinimized: boolean
  /** Wall-clock ms when the call was answered; null while ringing. */
  answeredAt: number | null
  endReason: CallEndReason | null
  error: string
}

interface CallActions {
  startOutgoing: (args: {
    callId: string
    chatId: string
    chatName: string
    mode: CallMode
    isGroup: boolean
    invitees: CallPeerInfo[]
  }) => void
  receiveIncoming: (info: IncomingCallInfo) => void
  /** Promote a ringing call (either direction) to the active phase. */
  markActive: () => void
  setLocalStream: (stream: MediaStream | null) => void
  upsertParticipant: (peer: CallPeerInfo, patch?: Partial<CallParticipant>) => void
  patchParticipant: (peerId: string, patch: Partial<CallParticipant>) => void
  removeParticipant: (peerId: string) => void
  setMicOn: (on: boolean) => void
  setCameraOn: (on: boolean) => void
  setScreenSharing: (on: boolean) => void
  setMinimized: (minimized: boolean) => void
  setError: (error: string) => void
  reset: (reason?: CallEndReason | null) => void
}

const initialState: CallState = {
  phase: "idle",
  callId: null,
  chatId: null,
  chatName: "",
  mode: "voice",
  isGroup: false,
  incoming: null,
  localStream: null,
  participants: {},
  isMicOn: true,
  isCameraOn: false,
  isScreenSharing: false,
  isMinimized: false,
  answeredAt: null,
  endReason: null,
  error: "",
}

function toParticipant(peer: CallPeerInfo, patch?: Partial<CallParticipant>): CallParticipant {
  return {
    id: peer.id,
    username: peer.username,
    displayName: peer.displayName,
    avatarUrl: peer.avatarUrl,
    connection: "connecting",
    isMuted: false,
    isCameraOff: true,
    isRinging: true,
    ...patch,
  }
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
      participants: Object.fromEntries(invitees.map((p) => [p.id, toParticipant(p)])),
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
      participants: { [info.caller.id]: toParticipant(info.caller, { isRinging: false }) },
    }),

  markActive: () =>
    set((s) => (s.phase === "active" ? s : { phase: "active", incoming: null, answeredAt: s.answeredAt ?? Date.now() })),

  setLocalStream: (localStream) => set({ localStream }),

  upsertParticipant: (peer, patch) =>
    set((s) => ({
      participants: {
        ...s.participants,
        [peer.id]: s.participants[peer.id]
          ? { ...s.participants[peer.id], ...peer, ...patch }
          : toParticipant(peer, patch),
      },
    })),

  patchParticipant: (peerId, patch) =>
    set((s) => {
      const existing = s.participants[peerId]
      if (!existing) return s
      return { participants: { ...s.participants, [peerId]: { ...existing, ...patch } } }
    }),

  removeParticipant: (peerId) =>
    set((s) => {
      if (!s.participants[peerId]) return s
      const participants = { ...s.participants }
      delete participants[peerId]
      return { participants }
    }),

  setMicOn: (isMicOn) => set({ isMicOn }),
  setCameraOn: (isCameraOn) => set({ isCameraOn }),
  setScreenSharing: (isScreenSharing) => set({ isScreenSharing }),
  setMinimized: (isMinimized) => set({ isMinimized }),
  setError: (error) => set({ error }),

  reset: (reason = null) => set({ ...initialState, endReason: reason }),
}))

/** True when a call occupies the device, so a second call must be refused. */
export function isCallBusy(): boolean {
  const { phase } = useCallStore.getState()
  return phase === "outgoing" || phase === "incoming" || phase === "active"
}
