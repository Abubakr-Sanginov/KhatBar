import { BluetoothPanel } from '@/components/bluetooth/bluetooth-panel'

export default function BluetoothPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <BluetoothPanel />
      </div>
    </main>
  )
}
