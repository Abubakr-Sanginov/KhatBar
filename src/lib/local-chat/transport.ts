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

import type { Socket } from "socket.io-client"
import { getSocket } from "@/lib/socket-client"
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
  private socket: Socket | null = null
  private socketHandlers: Array<[string, Parameters<Socket["on"]>[1]]> = []
  private socketWatch: ReturnType<typeof setInterval> | null = null
  private pendingPairing = new Map<string, { resolve: () => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>()

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
    this.attachSocket()
    this.socketWatch = setInterval(() => { if (getSocket() !== this.socket) this.attachSocket() }, 500)
    this.broadcastHello()
  }

  private profile() {
    return { deviceId: this.myDeviceId, name: this.myName, publicKey: this.myPublicKey }
  }

  private attachSocket(): void {
    const next = getSocket()
    if (next === this.socket) return
    this.socketHandlers.forEach(([event, handler]) => this.socket?.off(event, handler))
    this.socketHandlers = []
    this.socket = next
    if (!this.socket) return
    const register = () => { this.socket?.emit("local:register", this.profile()); this.socket?.emit("local:discover", { deviceId: this.myDeviceId, peerIds: Array.from(this.pcs.keys()).filter((id) => id && !id.startsWith("pairing-") && !id.startsWith("pending:")) }) }
    const onOffer = async ({ code, offer, peer }: { code: string; offer: RTCSessionDescriptionInit; peer: { deviceId: string; name: string; publicKey: string } }) => { const answer = await this.acceptPairingOffer(code, offer); this.socket?.emit("local:pair:answer", { code, answer, profile: this.profile() }); this.sink({ kind: "hello", deviceId: peer.deviceId, name: peer.name, publicKey: peer.publicKey }, peer.deviceId) }
    const onAnswer = async ({ code, answer, peer }: { code: string; answer: RTCSessionDescriptionInit; peer: { deviceId: string; name: string; publicKey: string } }) => { await this.acceptPairingAnswer(code, answer); this.sink({ kind: "hello", deviceId: peer.deviceId, name: peer.name, publicKey: peer.publicKey }, peer.deviceId) }
    const onOnline = ({ peer }: { peer: { deviceId: string; name: string; publicKey: string } }) => this.sink({ kind: "hello", deviceId: peer.deviceId, name: peer.name, publicKey: peer.publicKey }, peer.deviceId)
    const onSignal = ({ fromDeviceId, payload }: { fromDeviceId: string; payload: WireMessage }) => this.sink(payload, fromDeviceId)
    const settle = ({ code, error }: { code: string; error?: string }) => this.settlePairing(code, error ? new Error(error) : undefined)
    const complete = ({ code, peer }: { code: string; peer: { deviceId: string; name: string; publicKey: string } }) => { this.bindChannelPeerId(peer.deviceId); this.sink({ kind: "hello", deviceId: peer.deviceId, name: peer.name, publicKey: peer.publicKey }, peer.deviceId); this.settlePairing(code) }
    this.socketHandlers = [["connect", register], ["local:pair:offer", onOffer], ["local:pair:answer", onAnswer], ["local:pair:created", settle], ["local:pair:complete", complete], ["local:pair:error", settle], ["local:peer:online", onOnline], ["local:signal", onSignal]]
    this.socketHandlers.forEach(([event, handler]) => this.socket?.on(event, handler))
    if (this.socket.connected) register()
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

  private settlePairing(code: string, error?: Error): void {
    const pending = this.pendingPairing.get(code)
    if (!pending) return
    clearTimeout(pending.timer)
    this.pendingPairing.delete(code)
    if (error) pending.reject(error)
    else pending.resolve()
  }

  private connectedSocket(): Socket {
    this.attachSocket()
    if (!this.socket) {
      throw new Error("╨б╨╡╤А╨▓╨╡╤А ╤Б╨╛╨┐╤А╤П╨╢╨╡╨╜╨╕╤П ╨╜╨╡╨┤╨╛╤Б╤В╤Г╨┐╨╡╨╜. ╨Т╨╛╨╣╨┤╨╕╤В╨╡ ╨▓ ╨░╨║╨║╨░╤Г╨╜╤В ╨╕ ╨┐╨╛╨┐╤А╨╛╨▒╤Г╨╣╤В╨╡ ╤Б╨╜╨╛╨▓╨░.")
    }
    if (!this.socket.connected) {
      throw new Error("╨Э╨╡╤В ╤Б╨╛╨╡╨┤╨╕╨╜╨╡╨╜╨╕╤П ╤Б ╤Б╨╡╤А╨▓╨╡╤А╨╛╨╝ ╤Б╨╛╨┐╤А╤П╨╢╨╡╨╜╨╕╤П. ╨Я╤А╨╛╨▓╨╡╤А╤М╤В╨╡ ╤Б╨╡╤В╤М ╨╕ ╨┐╨╛╨┐╤А╨╛╨▒╤Г╨╣╤В╨╡ ╤Б╨╜╨╛╨▓╨░.")
    }
    return this.socket
  }

  private waitForPairing(code: string, send: (socket: Socket) => void): Promise<void> {
    const socket = this.connectedSocket()
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.settlePairing(code, new Error("╨Т╤А╨╡╨╝╤П ╨╛╨╢╨╕╨┤╨░╨╜╨╕╤П ╤Б╨╛╨┐╤А╤П╨╢╨╡╨╜╨╕╤П ╨╕╤Б╤В╨╡╨║╨╗╨╛. ╨Я╤А╨╛╨▓╨╡╤А╤М╤В╨╡ ╨║╨╛╨┤ ╨╕ ╨┐╨╛╨┐╤А╨╛╨▒╤Г╨╣╤В╨╡ ╤Б╨╜╨╛╨▓╨░."))
      }, 30000)
      this.pendingPairing.set(code, { resolve, reject, timer })
      try {
        send(socket)
      } catch (cause) {
        this.settlePairing(
          code,
          cause instanceof Error ? cause : new Error("╨Э╨╡ ╤Г╨┤╨░╨╗╨╛╤Б╤М ╨╛╤В╨┐╤А╨░╨▓╨╕╤В╤М ╨╖╨░╨┐╤А╨╛╤Б ╨╜╨░ ╤Б╨╛╨┐╤А╤П╨╢╨╡╨╜╨╕╨╡."),
        )
      }
    })
  }
  async createPairingCode(): Promise<string> { this.connectedSocket(); const { code, offer } = await this.createPairingOffer(); await this.waitForPairing(code, (socket) => socket.emit("local:pair:create", { code, offer, profile: this.profile() })); return code }
  joinPairingCode(code: string): Promise<void> { const normalized = code.trim().toUpperCase(); return this.waitForPairing(normalized, (socket) => socket.emit("local:pair:join", { code: normalized, profile: this.profile() })) }

  /** Send to a peer over every open channel. Returns true if at least one went through. */
  send(peerId: string, msg: WireMessage): boolean {
    let sent = false
    this.channel?.postMessage(msg)
    if (this.socket?.connected) {
      this.socket.emit("local:signal", { targetDeviceId: peerId, payload: msg })
      sent = true
    }
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
    pc.ondatachannel = (event) => this.attachDataChannel(event.channel, "")
    await pc.setRemoteDescription(offer)
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
    if (this.socketWatch) clearInterval(this.socketWatch)
    this.socketWatch = null
    this.pendingPairing.forEach(({ reject, timer }) => { clearTimeout(timer); reject(new Error("Pairing was cancelled")) })
    this.pendingPairing.clear()
    this.socketHandlers.forEach(([event, handler]) => this.socket?.off(event, handler))
    this.socketHandlers = []
    this.socket = null
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
