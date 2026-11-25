'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Register service worker if supported
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker active with scope:', registration.scope)
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error)
        })
    }

    // Don't show if already installed (running in standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // Check if user already dismissed this session
    const dismissed = sessionStorage.getItem('pwa-banner-dismissed')
    if (dismissed) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Small delay so it doesn't pop up immediately on page load
      setTimeout(() => setShowBanner(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    setIsDismissed(true)
    sessionStorage.setItem('pwa-banner-dismissed', '1')
  }

  if (!showBanner || isDismissed) return null

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl border border-[#ded5c7] bg-[#f8f5f0] p-4 shadow-xl"
      role="banner"
      aria-label="Install Booka app"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d46b4f]">
          <Download className="h-5 w-5 text-white" strokeWidth={2} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1e1c1a]">Add Booka to your home screen</p>
          <p className="mt-0.5 text-xs text-[#8c847c]">
            Get instant access to your studio dashboard — no browser needed.
          </p>
        </div>

        {/* Close */}
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1 text-[#8c847c] hover:bg-[#efe8df] hover:text-[#1e1c1a] transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleDismiss}
          className="flex-1 rounded-xl border border-[#ded5c7] bg-transparent py-2 text-sm font-medium text-[#8c847c] hover:bg-[#efe8df] transition-colors"
        >
          Not now
        </button>
        <button
          onClick={handleInstall}
          className="flex-1 rounded-xl bg-[#d46b4f] py-2 text-sm font-semibold text-white hover:bg-[#c05a3e] transition-colors"
        >
          Install app
        </button>
      </div>
    </div>
  )
}
