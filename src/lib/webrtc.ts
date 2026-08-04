"use client"

/**
 * Mesh WebRTC engine: one RTCPeerConnection per remote peer.
 *
 * Uses the "perfect negotiation" pattern so both sides may start negotiating
 * at the same time without glare. Politeness is derived deterministically from
 * the peer ids, so both ends always agree on who yields.
 */

export type SignalPayload =
  | { kind: "description"; description: RTCSessionDescriptionInit }
  | { kind: "candidate"; candidate: RTCIceCandidateInit | null }

export interface MeshHandlers {
  /** Send a signal to a single peer through the signaling channel. */
  sendSignal: (peerId: string, payload: SignalPayload) => void
  onRemoteStream: (peerId: string, stream: MediaStream) => void
  onPeerStateChange: (peerId: string, state: RTCPeerConnectionState) => void
}

export function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ]
  const turnUrls = process.env.NEXT_PUBLIC_TURN_URL
  if (turnUrls) {
    servers.push({
      urls: turnUrls.split(",").map((u) => u.trim()).filter(Boolean),
      username: process.env.NEXT_PUBLIC_TURN_USERNAME || undefined,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || undefined,
    })
  }
  return servers
}

interface PeerEntry {
  pc: RTCPeerConnection
  polite: boolean
  makingOffer: boolean
  ignoreOffer: boolean
  srdAnswerPending: boolean
  pendingCandidates: RTCIceCandidateInit[]
}

export class MeshConnection {
  private peers = new Map<string, PeerEntry>()
  private localStream: MediaStream | null = null
  private closed = false

  constructor(
    private readonly selfId: string,
    private readonly handlers: MeshHandlers,
    private readonly iceServers: RTCIceServer[] = buildIceServers(),
  ) {}

  setLocalStream(stream: MediaStream | null) {
    this.localStream = stream
    if (!stream) return
    for (const [, entry] of this.peers) this.syncTracks(entry.pc, stream)
  }

  /** Tracks are replaced in place so renegotiation is not needed on toggle. */
  private syncTracks(pc: RTCPeerConnection, stream: MediaStream) {
    for (const track of stream.getTracks()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === track.kind)
      if (sender) {
        if (sender.track !== track) sender.replaceTrack(track).catch(() => {})
      } else {
        pc.addTrack(track, stream)
      }
    }
  }

  peerIds(): string[] {
    return [...this.peers.keys()]
  }

  /**
   * Create (or return) the connection to a peer.
   * `initiator` only decides who fires the first offer; negotiation itself is
   * symmetric and safe from both sides.
   */
  addPeer(peerId: string, initiator: boolean): void {
    if (this.closed || peerId === this.selfId) return
    if (this.peers.has(peerId)) return

    const pc = new RTCPeerConnection({ iceServers: this.iceServers, bundlePolicy: "max-bundle" })
    const entry: PeerEntry = {
      pc,
      polite: this.selfId > peerId,
      makingOffer: false,
      ignoreOffer: false,
      srdAnswerPending: false,
      pendingCandidates: [],
    }
    this.peers.set(peerId, entry)

    pc.onnegotiationneeded = async () => {
      try {
        entry.makingOffer = true
        await pc.setLocalDescription()
        if (pc.localDescription) {
          this.handlers.sendSignal(peerId, { kind: "description", description: pc.localDescription.toJSON() })
        }
      } catch {
        /* negotiation retried by the next state change */
      } finally {
        entry.makingOffer = false
      }
    }

    pc.onicecandidate = ({ candidate }) => {
      this.handlers.sendSignal(peerId, { kind: "candidate", candidate: candidate ? candidate.toJSON() : null })
    }

    pc.ontrack = ({ track, streams }) => {
      const stream = streams[0]
      if (!stream) return
      track.onunmute = () => this.handlers.onRemoteStream(peerId, stream)
      this.handlers.onRemoteStream(peerId, stream)
    }

    pc.onconnectionstatechange = () => {
      this.handlers.onPeerStateChange(peerId, pc.connectionState)
      if (pc.connectionState === "failed") pc.restartIce()
    }

    if (this.localStream) this.syncTracks(pc, this.localStream)

    // With a local stream attached, onnegotiationneeded fires on its own.
    // Without one (audio blocked), the initiator still has to kick things off.
    if (initiator && !this.localStream) {
      void pc.setLocalDescription().then(() => {
        if (pc.localDescription) {
          this.handlers.sendSignal(peerId, { kind: "description", description: pc.localDescription.toJSON() })
        }
      }).catch(() => {})
    }
  }

  async handleSignal(peerId: string, payload: SignalPayload): Promise<void> {
    if (this.closed) return
    if (!this.peers.has(peerId)) this.addPeer(peerId, false)
    const entry = this.peers.get(peerId)
    if (!entry) return
    const { pc } = entry

    try {
      if (payload.kind === "description") {
        const description = payload.description
        const readyForOffer =
          !entry.makingOffer && (pc.signalingState === "stable" || entry.srdAnswerPending)
        const offerCollision = description.type === "offer" && !readyForOffer

        entry.ignoreOffer = !entry.polite && offerCollision
        if (entry.ignoreOffer) return

        entry.srdAnswerPending = description.type === "answer"
        await pc.setRemoteDescription(description)
        entry.srdAnswerPending = false

        for (const candidate of entry.pendingCandidates.splice(0)) {
          await pc.addIceCandidate(candidate).catch(() => {})
        }

        if (description.type === "offer") {
          await pc.setLocalDescription()
          if (pc.localDescription) {
            this.handlers.sendSignal(peerId, { kind: "description", description: pc.localDescription.toJSON() })
          }
        }
        return
      }

      if (!payload.candidate) return
      if (!pc.remoteDescription) {
        entry.pendingCandidates.push(payload.candidate)
        return
      }
      await pc.addIceCandidate(payload.candidate)
    } catch {
      if (!entry.ignoreOffer) {
        /* transient signaling error; ICE restart covers recovery */
      }
    }
  }

  removePeer(peerId: string): void {
    const entry = this.peers.get(peerId)
    if (!entry) return
    entry.pc.onnegotiationneeded = null
    entry.pc.onicecandidate = null
    entry.pc.ontrack = null
    entry.pc.onconnectionstatechange = null
    entry.pc.close()
    this.peers.delete(peerId)
  }

  close(): void {
    this.closed = true
    for (const peerId of [...this.peers.keys()]) this.removePeer(peerId)
    this.localStream = null
  }
}
