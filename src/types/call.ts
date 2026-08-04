export type CallMode = "voice" | "video"

/** Lifecycle of the call as seen by this client. */
export type CallPhase = "idle" | "outgoing" | "incoming" | "active" | "ended"

export type CallEndReason =
  | "hangup"
  | "declined"
  | "canceled"
  | "busy"
  | "unanswered"
  | "failed"
  | "media-denied"

export interface CallPeerInfo {
  id: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
}

export interface CallParticipant extends CallPeerInfo {
  /** Undefined until the peer's tracks arrive. */
  stream?: MediaStream
  connection: "connecting" | "connected" | "failed"
  isMuted: boolean
  isCameraOff: boolean
  /** True while the peer is invited but has not accepted yet. */
  isRinging: boolean
}

export interface IncomingCallInfo {
  callId: string
  chatId: string
  chatName: string
  mode: CallMode
  isGroup: boolean
  caller: CallPeerInfo
}
