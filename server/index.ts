import { createServer } from "http"
import { Server } from "socket.io"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const httpServer = createServer()
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const io = new Server(httpServer, {
  cors: { origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000", credentials: true },
})

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) return next(new Error("Unauthorized"))
  try {
    const session = await prisma.session.findUnique({ where: { token } })
    if (!session || session.expiresAt < new Date()) return next(new Error("Unauthorized"))
    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user) return next(new Error("Unauthorized"))
    ;(socket as any).user = user
    next()
  } catch {
    next(new Error("Unauthorized"))
  }
})

io.on("connection", (socket) => {
  const user = (socket as any).user
  console.log(`User connected: ${user.username}`)

  socket.on("join:chat", (chatId: string) => {
    socket.join(`chat:${chatId}`)
  })

  socket.on("leave:chat", (chatId: string) => {
    socket.leave(`chat:${chatId}`)
  })

  socket.on("message:send", async (data: { chatId: string; content: string; type?: string }) => {
    const message = await prisma.message.create({
      data: {
        content: data.content,
        type: (data.type as any) || "TEXT",
        chatId: data.chatId,
        senderId: user.id,
      },
    })
    const fullMessage = await prisma.message.findUnique({
      where: { id: message.id },
    })
    io.to(`chat:${data.chatId}`).emit("message:new", fullMessage)
  })

  socket.on("room:join", (roomId: string) => {
    socket.join(`room:${roomId}`)
    socket.to(`room:${roomId}`).emit("room:user-joined", { userId: user.id, username: user.username })
  })

  socket.on("room:leave", (roomId: string) => {
    socket.leave(`room:${roomId}`)
    socket.to(`room:${roomId}`).emit("room:user-left", { userId: user.id })
  })

  socket.on("signal:offer", (data: { roomId: string; offer: any }) => {
    socket.to(`room:${data.roomId}`).emit("signal:offer", { offer: data.offer, userId: user.id })
  })

  socket.on("signal:answer", (data: { roomId: string; answer: any }) => {
    socket.to(`room:${data.roomId}`).emit("signal:answer", { answer: data.answer, userId: user.id })
  })

  socket.on("signal:ice-candidate", (data: { roomId: string; candidate: any }) => {
    socket.to(`room:${data.roomId}`).emit("signal:ice-candidate", { candidate: data.candidate, userId: user.id })
  })

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${user.username}`)
  })
})

const PORT = parseInt(process.env.WS_PORT || "3001")
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`)
})