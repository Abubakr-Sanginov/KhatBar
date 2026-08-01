import { NextResponse } from 'next/server'

export async function POST(
  _request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await context.params

  return NextResponse.json({
    ok: true,
    roomId,
    token: `demo-token-${roomId}`,
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  })
}
