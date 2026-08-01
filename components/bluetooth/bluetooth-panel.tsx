'use client'

import { useState } from 'react'

import { requestBluetoothPairing } from '@/lib/messenger/bluetooth'

export function BluetoothPanel() {
  const [device, setDevice] = useState<{ id: string; name: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const connect = async () => {
    setIsPending(true)
    setError(null)

    try {
      const result = await requestBluetoothPairing()
      setDevice(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bluetooth pairing failed')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Experimental transport</div>
      <h1 className="mt-2 text-2xl font-semibold text-white">Bluetooth nearby discovery</h1>
      <p className="mt-3 text-sm text-slate-400">
        Pair with a nearby device to experiment with offline / proximity-based chat flows.
      </p>

      <button
        className="mt-6 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-slate-950"
        disabled={isPending}
        onClick={connect}
        type="button"
      >
        {isPending ? 'Searching…' : 'Pair device'}
      </button>

      {device ? (
        <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          Connected to <strong>{device.name}</strong> ({device.id})
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      ) : null}
    </div>
  )
}
