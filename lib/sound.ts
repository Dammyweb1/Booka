'use client'

export function playBeepSound() {
  if (typeof window === 'undefined') return
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()

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

