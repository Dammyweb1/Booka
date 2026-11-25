import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Booka — Appointment Booking',
    short_name: 'Booka',
    description:
      'Create a booking page, share it with clients, and manage appointments from one backoffice.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f8f5f0',
    theme_color: '#000000',
    categories: ['business', 'lifestyle', 'productivity'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
    screenshots: [],
    shortcuts: [
      {
        name: 'Dashboard',
        short_name: 'Dashboard',
        description: 'Open your studio backoffice',
        url: '/dashboard',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
    ],
  }
}
