"use client"

/**
 * Call tones are synthesized with WebAudio so no audio assets are needed.
 * All tones are quiet by design; the ring loops until stopped.
 */

type Ctx = AudioContext & { webkitAudioContext?: never }

let ctx: AudioContext | null = null
let ringTimer: ReturnType<typeof setInterval> | null = null

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  if (ctx.state === "suspended") void ctx.resume()
  return ctx as Ctx
}

function beep(freq: number, startAt: number, duration: number, gainValue = 0.08) {
  const audio = getCtx()
  if (!audio) return
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = "sine"
  osc.frequency.value = freq
  const t0 = audio.currentTime + startAt
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(gainValue, t0 + 0.03)
  gain.gain.setValueAtTime(gainValue, t0 + duration - 0.05)
  gain.gain.linearRampToValueAtTime(0, t0 + duration)
  osc.connect(gain).connect(audio.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

/** Incoming ring: two-tone chirp repeating every 2.4s. */
export function startIncomingRing() {
  stopRing()
  const pattern = () => {
    beep(880, 0, 0.35, 0.09)
    beep(1046, 0.4, 0.35, 0.09)
  }
  pattern()
  ringTimer = setInterval(pattern, 2400)
}

/** Outgoing ringback: single low tone every 3s. */
export function startOutgoingRing() {
  stopRing()
  const pattern = () => beep(440, 0, 0.9, 0.05)
  pattern()
  ringTimer = setInterval(pattern, 3000)
}

export function stopRing() {
  if (ringTimer) {
    clearInterval(ringTimer)
    ringTimer = null
  }
}

export function playCallEnded() {
  stopRing()
  beep(560, 0, 0.18, 0.06)
  beep(420, 0.2, 0.28, 0.06)
}

export function playCallConnected() {
  stopRing()
  beep(660, 0, 0.12, 0.05)
  beep(880, 0.14, 0.16, 0.05)
}
