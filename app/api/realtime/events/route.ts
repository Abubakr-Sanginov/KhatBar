import { createSseStream } from '@/lib/messenger/realtime'

export async function GET() {
  const stream = createSseStream()

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
