'use client'

import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react'

import { useVoiceRoom } from '@/lib/messenger/webrtc'

export function VoiceRoomPanel({ roomId }: { roomId: string }) {
  const room = useVoiceRoom(roomId)

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4">
      <div className="mb-4">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">WebRTC</div>
        <h3 className="mt-2 text-lg font-semibold text-white">Voice room</h3>
        <p className="mt-2 text-sm text-slate-400">Join a room, toggle mute, and extend this hook with a real SFU / signaling backend.</p>
      </div>
      <div className="flex gap-3">
        {room.isConnected ? (
          <button onClick={room.leave} className="inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-medium text-white" type="button">
            <PhoneOff size={16} /> Leave
          </button>
        ) : (
          <button onClick={room.join} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-slate-950" type="button">
            <Phone size={16} /> {room.isJoining ? 'Joining…' : 'Join'}
          </button>
        )}
        <button
          onClick={room.toggleMute}
          disabled={!room.isConnected}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 px-4 py-3 text-sm text-slate-200 disabled:opacity-40"
          type="button"
        >
          {room.isMuted ? <MicOff size={16} /> : <Mic size={16} />}
          {room.isMuted ? 'Unmute' : 'Mute'}
        </button>
      </div>
    </div>
  )
}
