'use client'

export async function requestBluetoothPairing() {
  if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
    throw new Error('Web Bluetooth is not supported in this browser')
  }

  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: ['battery_service'],
  })

  return { id: device.id, name: device.name ?? 'Unknown nearby device' }
}
