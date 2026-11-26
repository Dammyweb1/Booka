import { defaultCache } from '@serwist/next/worker'
import { Serwist } from 'serwist'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'

// This declares the global __SW_MANIFEST injected by the serwist build plugin
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[]
  }
}

type ActivationEvent = {
  waitUntil: (promise: Promise<unknown>) => void
}

declare const self: WorkerGlobalScope & {
  addEventListener: (
    type: 'activate',
    listener: (event: ActivationEvent) => void
  ) => void
}

const cacheableAssetNames = new Set([
  'google-fonts-webfonts',
  'google-fonts-stylesheets',
  'static-font-assets',
  'static-image-assets',
  'next-static-js-assets',
  'next-image',
  'static-audio-assets',
  'static-video-assets',
  'static-js-assets',
  'static-style-assets',
])

const runtimeCaching = defaultCache.filter(({ handler }) =>
  typeof handler === 'object' &&
  handler !== null &&
  'cacheName' in handler &&
  typeof handler.cacheName === 'string' &&
  cacheableAssetNames.has(handler.cacheName)
)

const privatePageCaches = new Set([
  'pages',
  'pages-rsc',
  'pages-rsc-prefetch',
  'next-data',
  'static-data-assets',
  'apis',
  'others',
  'cross-origin',
])

// Remove page/API responses cached by older workers so another account cannot see them.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => privatePageCaches.has(cacheName))
          .map((cacheName) => caches.delete(cacheName))
      )
    )
  )
})

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
})

serwist.addEventListeners()
