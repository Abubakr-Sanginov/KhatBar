let RTCPeerConnection: any;
let RTCSessionDescription: any;
try {
  const webrtc = require("react-native-webrtc");
  RTCPeerConnection = webrtc.RTCPeerConnection;
  RTCSessionDescription = webrtc.RTCSessionDescription;
} catch {}

let Zeroconf: any = null;
try {
  Zeroconf = require("react-native-zeroconf").default;
} catch {}
import type { Socket } from "socket.io-client";
import { getSocketInstance } from "../../socket/socket";
import type { WireMessage, DeviceIdentity } from "./types";

const SERVICE_TYPE = "khatbar";
const SERVICE_PORT = 18900;
const PEER_NAME = "khatbar-local";

export type WireSink = (msg: WireMessage, peerId: string) => void;

export class LocalTransport {
  private zeroconf: any = null;
  private pcs = new Map<string, RTCPeerConnection>();
  private dataChannels = new Map<string, RTCDataChannel>();
  private pendingOffers = new Map<string, { peerId: string; timer: ReturnType<typeof setTimeout> }>();
  private pendingAnswers = new Map<string, { peerId: string; timer: ReturnType<typeof setTimeout> }>();
  private lastSeen = new Map<string, ReturnType<typeof setTimeout>>();
  private sink: WireSink;
  private myIdentity: DeviceIdentity | null = null;
  private advertised = false;
  private onPeerOffline: ((peerId: string) => void) | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private socket: Socket | null = null;
  private socketHandlers: Array<[string, (...args: any[]) => void]> = [];

  constructor(sink: WireSink, onPeerOffline?: (peerId: string) => void) {
    this.sink = sink;
    this.onPeerOffline = onPeerOffline || null;
    if (Zeroconf) {
      this.zeroconf = new Zeroconf();
    }
  }

  start(identity: DeviceIdentity) {
    if (!Zeroconf) {
      console.log("[LocalTransport] Zeroconf not available - local chat requires dev build");
      return;
    }
    this.myIdentity = identity;
    this.attachSocket();

    this.zeroconf.on("found", (name: string, type: string, domain: string) => {
      if (type !== SERVICE_TYPE) return;
      this.zeroconf.resolve(type, name, domain);
    });

    this.zeroconf.on("resolved", (service: any) => {
      if (service.type !== SERVICE_TYPE) return;
      if (service.txt && service.txt.deviceId && service.txt.deviceId !== identity.deviceId) {
        this.sink(
          { kind: "hello", deviceId: service.txt.deviceId, name: service.txt.name || "Unknown", publicKey: service.txt.publicKey || "" },
          service.txt.deviceId
        );
        this.markSeen(service.txt.deviceId);
      }
    });

    this.zeroconf.on("error", (err: Error) => {
      console.log("[LocalTransport] Zeroconf error:", err.message);
    });

    this.zeroconf.publish(`${PEER_NAME}-${identity.deviceId.slice(0, 8)}`, SERVICE_TYPE, SERVICE_PORT, {
      deviceId: identity.deviceId,
      name: identity.name,
      publicKey: identity.publicKey,
    });
    this.advertised = true;

    this.heartbeatTimer = setInterval(() => {
      if (this.advertised && this.myIdentity && this.zeroconf) {
        this.zeroconf.unpublishAll();
        this.zeroconf.publish(`${PEER_NAME}-${this.myIdentity.deviceId.slice(0, 8)}`, SERVICE_TYPE, SERVICE_PORT, {
          deviceId: this.myIdentity.deviceId,
          name: this.myIdentity.name,
          publicKey: this.myIdentity.publicKey,
        });
      }
    }, 10_000);

    this.zeroconf.scan(SERVICE_TYPE);
  }

  stop() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.advertised && this.zeroconf) {
      this.zeroconf.unpublishAll();
      this.advertised = false;
    }
    this.zeroconf?.stop();
    this.pcs.forEach((pc) => pc.close());
    this.pcs.clear();
    this.dataChannels.clear();
    this.pendingOffers.forEach((o) => clearTimeout(o.timer));
    this.pendingOffers.clear();
    this.pendingAnswers.forEach((a) => clearTimeout(a.timer));
    this.pendingAnswers.clear();
    this.lastSeen.forEach((t) => clearTimeout(t));
    this.lastSeen.clear();
    this.socketHandlers.forEach(([event, handler]) => this.socket?.off(event, handler));
    this.socketHandlers = [];
    this.socket = null;
  }

  private profile() {
    if (!this.myIdentity) throw new Error("Local identity is not ready");
    return { deviceId: this.myIdentity.deviceId, name: this.myIdentity.name, publicKey: this.myIdentity.publicKey };
  }

  private attachSocket() {
    this.socket = getSocketInstance();
    if (!this.socket) return;
    const register = () => {
      if (!this.myIdentity) return;
      this.socket?.emit("local:register", this.profile());
      const peerIds = Array.from(this.pcs.keys()).filter((id) => id && !id.startsWith("pairing-") && !id.startsWith("pending:"));
      this.socket?.emit("local:discover", { deviceId: this.myIdentity.deviceId, peerIds });
    };
    const onOffer = async ({ code, offer, peer }: any) => {
      const answer = await this.acceptPairingOffer(code, offer);
      this.socket?.emit("local:pair:answer", { code, answer, profile: this.profile() });
      this.sink({ kind: "hello", deviceId: peer.deviceId, name: peer.name, publicKey: peer.publicKey }, peer.deviceId);
    };
    const onAnswer = async ({ code, answer, peer }: any) => {
      await this.acceptPairingAnswer(code, answer);
      this.sink({ kind: "hello", deviceId: peer.deviceId, name: peer.name, publicKey: peer.publicKey }, peer.deviceId);
    };
    const onOnline = ({ peer }: any) => this.sink({ kind: "hello", deviceId: peer.deviceId, name: peer.name, publicKey: peer.publicKey }, peer.deviceId);
    const onSignal = ({ fromDeviceId, payload }: any) => this.sink(payload, fromDeviceId);
    this.socketHandlers = [["connect", register], ["local:pair:offer", onOffer], ["local:pair:answer", onAnswer], ["local:peer:online", onOnline], ["local:signal", onSignal]];
    this.socketHandlers.forEach(([event, handler]) => this.socket?.on(event, handler));
    register();
  }

  async createPairingCode(): Promise<string> {
    if (!this.socket) throw new Error("Server connection is not ready");
    const { code, offer } = await this.createPairingOffer();
    this.socket.emit("local:pair:create", { code, offer, profile: this.profile() });
    return code;
  }

  joinPairingCode(code: string): void {
    if (!this.socket) throw new Error("Server connection is not ready");
    this.socket.emit("local:pair:join", { code: code.trim().toUpperCase(), profile: this.profile() });
  }

  send(peerId: string, msg: WireMessage): boolean {
    const dc = this.dataChannels.get(peerId);
    if (dc && dc.readyState === "open") {
      dc.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }

  broadcast(msg: WireMessage) {
    this.dataChannels.forEach((dc, peerId) => {
      if (dc.readyState === "open") {
        dc.send(JSON.stringify(msg));
      }
    });
  }

  private markSeen(peerId: string) {
    const existing = this.lastSeen.get(peerId);
    if (existing) clearTimeout(existing);
    this.lastSeen.set(
      peerId,
      setTimeout(() => {
        this.lastSeen.delete(peerId);
        this.onPeerOffline?.(peerId);
      }, 15_000)
    );
  }

  private newPeerConnection(): any {
    if (!RTCPeerConnection) throw new Error("WebRTC not available - requires dev build");
    return new RTCPeerConnection({ iceServers: [] });
  }

  private attachDataChannel(dc: RTCDataChannel, peerId: string) {
    dc.onopen = () => {
      console.log("[LocalTransport] DataChannel open with", peerId);
      if (this.myIdentity) {
        this.send(peerId, { kind: "hello", deviceId: this.myIdentity.deviceId, name: this.myIdentity.name, publicKey: this.myIdentity.publicKey });
      }
    };
    dc.onmessage = (event: any) => {
      try {
        const msg = JSON.parse(event.data) as WireMessage;
        if (msg.kind === "hello" && msg.deviceId === this.myIdentity?.deviceId) return;
        let resolvedPeerId = peerId;
        if (msg.kind === "hello" && (peerId === "" || peerId.startsWith("pairing-"))) {
          resolvedPeerId = msg.deviceId;
          this.bindChannelPeerId(resolvedPeerId);
        }
        if (msg.kind === "hello") this.markSeen(resolvedPeerId);
        this.sink(msg, resolvedPeerId);
      } catch {}
    };
    dc.onerror = () => {};
    dc.onclose = () => {
      this.dataChannels.delete(peerId);
    };
    this.dataChannels.set(peerId, dc);
  }

  private bindChannelPeerId(realPeerId: string) {
    const pc = this.pcs.get("");
    if (pc) {
      this.pcs.delete("");
      this.pcs.set(realPeerId, pc);
    }
    const dc = this.dataChannels.get("");
    if (dc) {
      this.dataChannels.delete("");
      this.dataChannels.set(realPeerId, dc);
    }
  }

  async createPairingOffer(): Promise<{ code: string; offer: RTCSessionDescriptionInit }> {
    const pc = this.newPeerConnection();
    const dc = pc.createDataChannel("khatbar");
    const peerId = "pairing-" + this.randomCode();
    this.attachDataChannel(dc, peerId);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const code = this.randomCode();
    this.pendingOffers.set(code, {
      peerId,
      timer: setTimeout(() => {
        this.pendingOffers.delete(code);
        pc.close();
      }, 120_000),
    });
    this.pcs.set(peerId, pc);

    return { code, offer: offer as RTCSessionDescriptionInit };
  }

  async acceptPairingOffer(code: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const pc = this.newPeerConnection();
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const dc = pc.createDataChannel("khatbar");
    this.attachDataChannel(dc, "");

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.pendingAnswers.set(code, {
      peerId: "",
      timer: setTimeout(() => {
        this.pendingAnswers.delete(code);
        pc.close();
      }, 120_000),
    });
    this.pcs.set("", pc);

    return answer as RTCSessionDescriptionInit;
  }

  async acceptPairingAnswer(code: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const pending = this.pendingOffers.get(code);
    if (!pending) throw new Error("Unknown pairing code");
    clearTimeout(pending.timer);
    this.pendingOffers.delete(code);
    const pc = this.pcs.get(pending.peerId);
    if (!pc) throw new Error("Pairing session expired");
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    this.pcs.delete(pending.peerId);
    this.pcs.set("", pc);
  }

  private randomCode(): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return code;
  }
}
