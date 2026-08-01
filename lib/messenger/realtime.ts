export function createSseStream(onOpen?: () => void) {
  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    start(controller) {
      onOpen?.()

      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      send('connected', { ok: true, ts: new Date().toISOString() })

      const interval = setInterval(() => {
        send('heartbeat', { ts: new Date().toISOString() })
      }, 15000)

      const cleanup = () => clearInterval(interval)
      ;(controller as typeof controller & { cleanup?: () => void }).cleanup = cleanup
    },
    cancel() {
      // noop
    },
  })
}
