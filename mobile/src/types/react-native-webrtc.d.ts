/**
 * react-native-webrtc 124 ships no type declarations (its package.json points
 * "types" at lib/typescript/index.d.ts, which is not published). These are the
 * pieces of the API this app actually uses; they mirror the DOM WebRTC types so
 * the standard lib's RTCPeerConnection typings stay usable.
 */
declare module "react-native-webrtc" {
  import type * as React from "react";
  import type { ViewProps } from "react-native";

  export interface MediaStreamConstraintsRN {
    audio?: boolean | Record<string, unknown>;
    video?: boolean | Record<string, unknown>;
  }

  export const mediaDevices: {
    getUserMedia(constraints: MediaStreamConstraintsRN): Promise<MediaStream>;
    getDisplayMedia(constraints?: MediaStreamConstraintsRN): Promise<MediaStream>;
    enumerateDevices(): Promise<MediaDeviceInfo[]>;
  };

  export interface RTCVideoViewProps extends ViewProps {
    streamURL: string;
    mirror?: boolean;
    objectFit?: "contain" | "cover";
    zOrder?: number;
  }

  export const RTCView: React.ComponentType<RTCVideoViewProps>;
  export const ScreenCapturePickerView: React.ComponentType<ViewProps>;

  export function registerGlobals(): void;

  export const RTCPeerConnection: typeof globalThis.RTCPeerConnection;
  export const RTCIceCandidate: typeof globalThis.RTCIceCandidate;
  export const RTCSessionDescription: typeof globalThis.RTCSessionDescription;
  export const MediaStream: typeof globalThis.MediaStream;
  export const MediaStreamTrack: typeof globalThis.MediaStreamTrack;

  export const permissions: {
    request(options: { name: string }): Promise<boolean>;
  };

  export function startIOSPIP(ref: unknown): void;
  export function stopIOSPIP(ref: unknown): void;
}
