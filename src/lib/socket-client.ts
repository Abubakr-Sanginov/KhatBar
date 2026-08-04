"use client"

import { io, type Socket } from "socket.io-client"

let socket: Socket | null = null
let currentToken: string | null = null

export function connectSocket(token: string) {
  if (socket && currentToken === token) return socket
  if (socket) socket.disconnect()
  currentToken = token
  socket = io(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3000", {
    transports: ["websocket"],
    auth: { token },
  })
  return socket
}

export function getSocket(): Socket | null {
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
    currentToken = null
  }
}
