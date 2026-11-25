'use client'

let sharedAudioContext: AudioContext | null = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return null
  sharedAudioContext ??= new AudioContextClass()
  return sharedAudioContext
}

export function unlockBeepSound() {
  try {
    const context = getAudioContext()
    if (context?.state === 'suspended') {
      void context.resume().catch((err) => console.warn('Audio chime could not be enabled:', err))
    }
  } catch (err) {
    console.warn('Audio chime could not be enabled:', err)
  }
}

export function playBeepSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      void ctx.resume().catch((err) => console.warn('Audio chime could not resume:', err))
    }

    // Bell chime: Dual tone harmonic chime (880Hz + 1760Hz)
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gainNode = ctx.createGain()

    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(880, ctx.currentTime) // A5
    osc1.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.6)

    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(1760, ctx.currentTime) // A6 chime
    osc2.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.6)

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)

    osc1.connect(gainNode)
    osc2.connect(gainNode)
    gainNode.connect(ctx.destination)

    osc1.start()
    osc2.start()
    osc1.stop(ctx.currentTime + 0.6)
    osc2.stop(ctx.currentTime + 0.6)
  } catch (err) {
    console.warn('Audio chime could not play:', err)
  }
}

