export type CallMode = "voice" | "video";

export interface CallParticipant {
  id: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  connection: "new" | "connecting" | "connected" | "failed" | "disconnected";
  stream?: MediaStream;
  isRinging?: boolean;
}

export interface IncomingCallInfo {
  callId: string;
  chatId: string;
  chatName: string;
  mode: CallMode;
  isGroup: boolean;
  caller: CallParticipant;
}

export interface OutgoingCallInfo {
  callId: string;
  chatId: string;
  chatName: string;
  mode: CallMode;
  isGroup: boolean;
  invitees: CallParticipant[];
}
