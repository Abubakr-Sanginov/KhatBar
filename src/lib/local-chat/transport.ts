/**
 * Transport layer for local chats.
 *
 *  1. BroadcastChannel ("khatbar-beacon") — peer discovery and messaging
 *     between tabs/windows on the same machine.
 *  2. WebRTC DataChannel — LAN messaging between different machines.
 *     Pairing exchanges SDP offers/answers via an 8-char code:
 *       A: createPairingOffer() -> { code, offerJson }
 *       B: acceptPairingOffer(code, offerJson) -> answerJson
 *       A: acceptPairingAnswer(code, answerJson)
 */

import type { WireMessage } from "./types"
import { LOCAL_CHAT_BEACON } from "./types"

export type TransportSink = (msg: WireMessage, peerId: string) => void

export interface PairingOffer {
  code: string
  offer: RTCSessionDescriptionInit
}

export class LocalTransport {
  private channel: BroadcastChannel | null = null
  private sink: TransportSink
  private myDeviceId = ""
  private myName = ""
  private myPublicKey = ""

  /** WebRTC peer connections: deviceId -> RTCPeerConnection */
  private pcs = new Map<string, RTCPeerConnection>()
  private dataChannels = new Map<string, RTCDataChannel>()
  private pendingOffers = new Map<string, { peerId: string; timer: ReturnType<typeof setTimeout> }>()
  private pendingAnswers = new Map<string, { peerId: string; timer: ReturnType<typeof setTimeout> }>()

  constructor(sink: TransportSink) {
    this.sink = sink
  }

  start(identity: { deviceId: string; name: string; publicKey: string }): void {
    this.myDeviceId = identity.deviceId
    this.myName = identity.name
    this.myPublicKey = identity.publicKey
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(LOCAL_CHAT_BEACON)
      this.channel.onmessage = (event: MessageEvent) => {
        const msg = event.data as WireMessage | undefined
        if (!msg || typeof msg !== "object") return
        if (msg.kind === "hello" && msg.deviceId === this.myDeviceId) return
        this.sink(msg, msg.deviceId)
      }
    }
    this.broadcastHello()
  }

  private broadcastHello(): void {
    const hello: WireMessage = {
      kind: "hello",
      deviceId: this.myDeviceId,
      name: this.myName,
      publicKey: this.myPublicKey,
    }
    this.channel?.postMessage(hello)
  }

  /** Send to a peer over every open channel. Returns true if at least one went through. */
  send(peerId: string, msg: WireMessage): boolean {
    let sent = false
    this.channel?.postMessage(msg)
    const dc = this.dataChannels.get(peerId)
    if (dc && dc.readyState === "open") {
      dc.send(JSON.stringify(msg))
      sent = true
    }
    return sent
  }

  /** Advertise presence on demand (after pairing, on reload, etc.). */
  announce(): void {
    this.broadcastHello()
  }

  isPeerReachable(peerId: string): boolean {
    return this.dataChannels.get(peerId)?.readyState === "open"
  }

  // ---------------------------------------------------------------- WebRTC

  private newPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection()
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        this.dataChannels.delete("")
        this.pcs.forEach((existing, peerId) => {
          if (existing === pc) {
            this.pcs.delete(peerId)
            this.dataChannels.delete(peerId)
          }
        })
      }
    }
    return pc
  }

  /** Device A: create an offer + code, hand the JSON to the user. */
  async createPairingOffer(): Promise<PairingOffer> {
    const peerId = "pairing-" + this.randomCode()
    const pc = this.newPeerConnection()
    const dc = pc.createDataChannel("khatbar")
    this.attachDataChannel(dc, peerId)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    const code = this.randomCode()
    const timer = setTimeout(() => {
      this.pendingOffers.delete(code)
      pc.close()
    }, 120_000)
    this.pendingOffers.set(code, { peerId, timer })
    this.pcs.set(peerId, pc)
    return { code, offer }
  }

  /** Device B: accept an offer, returns the answer JSON to send back. */
  async acceptPairingOffer(code: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const pc = this.newPeerConnection()
    await pc.setRemoteDescription(offer)
    const dc = pc.createDataChannel("khatbar")
    this.attachDataChannel(dc, "")
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    this.pendingAnswers.set(code, {
      peerId: "",
      timer: setTimeout(() => {
        this.pendingAnswers.delete(code)
        pc.close()
      }, 120_000),
    })
    this.pcs.set("", pc)
    return answer
  }

  /** Device A: finish pairing with the answer from device B. */
  async acceptPairingAnswer(code: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const pending = this.pendingOffers.get(code)
    if (!pending) throw new Error("Unknown pairing code")
    clearTimeout(pending.timer)
    this.pendingOffers.delete(code)
    const pc = this.pcs.get(pending.peerId)
    if (!pc) throw new Error("Pairing session expired")
    await pc.setRemoteDescription(answer)
    this.pcs.set("", pc)
    this.pendingAnswers.set(code, { peerId: "", timer: setTimeout(() => pc.close(), 120_000) })
  }

  /** After the data channel opens, resolve the real peer id. */
  private bindChannelPeerId(realPeerId: string): void {
    const pc = this.pcs.get("")
    if (!pc) return
    this.pcs.delete("")
    this.pcs.set(realPeerId, pc)
    const dc = this.dataChannels.get("")
    if (dc) {
      this.dataChannels.delete("")
      this.dataChannels.set(realPeerId, dc)
    }
    if (realPeerId) this.broadcastHello()
  }

  private attachDataChannel(dc: RTCDataChannel, peerId: string): void {
    this.dataChannels.set(peerId, dc)
    dc.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as WireMessage
        if (peerId.startsWith("pairing-") || peerId === "") {
          if (msg.kind === "hello") {
            this.bindChannelPeerId(msg.deviceId)
          }
        }
        if (msg.kind === "hello" && msg.deviceId === this.myDeviceId) return
        this.sink(msg, msg.deviceId)
      } catch {
        // ignore malformed frames
      }
    }
    dc.onclose = () => this.dataChannels.delete(peerId)
    dc.onopen = () => {
      if (peerId.startsWith("pairing-")) {
        const pc = this.pcs.get(peerId)
        this.pcs.delete(peerId)
        if (pc) {
          this.pcs.set("pending:" + peerId, pc)
        }
      }
      this.sink(
        {
          kind: "hello",
          deviceId: this.myDeviceId,
          name: this.myName,
          publicKey: this.myPublicKey,
        },
        peerId,
      )
    }
  }

  private randomCode(): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let code = ""
    for (let i = 0; i < 8; i++) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)]
    }
    return code
  }

  dispose(): void {
    this.channel?.close()
    this.pcs.forEach((pc) => pc.close())
    this.pcs.clear()
    this.dataChannels.clear()
    this.pendingOffers.forEach((p) => clearTimeout(p.timer))
    this.pendingOffers.clear()
    this.pendingAnswers.forEach((p) => clearTimeout(p.timer))
    this.pendingAnswers.clear()
  }
}
