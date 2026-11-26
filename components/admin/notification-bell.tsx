'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { createAdminSupabaseClient as createSupabaseClient } from '@/lib/supabase'
import { playBeepSound, unlockBeepSound } from '@/lib/sound'

interface AdminNotification {
  id: number
  event_type: 'business_signup' | 'booking_payment'
  title: string
  message: string
  related_id: string
  created_at: string
  read_at: string | null
}

export function AdminNotificationBell() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    const supabase = createSupabaseClient()
    const unlockAudio = () => unlockBeepSound()
    document.addEventListener('pointerdown', unlockAudio, { once: true })
    document.addEventListener('keydown', unlockAudio, { once: true })

    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('id, event_type, title, message, related_id, created_at, read_at')
        .order('created_at', { ascending: false })
        .limit(25)

      if (error) {
        console.error('Could not load admin notifications:', error.message)
        if (active) setErrorMessage('Could not load notifications.')
        return
      }

      if (active) {
        const loaded = (data ?? []) as AdminNotification[]
        setNotifications((current) => {
          const byId = new Map<number, AdminNotification>()
          for (const notification of loaded) byId.set(notification.id, notification)
          for (const notification of current) byId.set(notification.id, notification)
          return [...byId.values()]
            .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
            .slice(0, 25)
        })
      }
    }

    void loadNotifications()

    const channel = supabase
      .channel(`admin-backoffice-notifications-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_notifications' },
        (payload) => {
          const notification = payload.new as AdminNotification
          if (!active) return
          setNotifications((current) => [
            notification,
            ...current.filter((item) => item.id !== notification.id),
          ].slice(0, 25))
          playBeepSound()
        }
      )
      .subscribe((status, error) => {
        if (!active) return
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`Admin notification subscription status: ${status}`, error)
          setErrorMessage('Live notifications are temporarily unavailable.')
        }
      })

    return () => {
      active = false
      document.removeEventListener('pointerdown', unlockAudio)
      document.removeEventListener('keydown', unlockAudio)
      void supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [isOpen])

  const unreadCount = notifications.filter((notification) => !notification.read_at).length

  const handleOpen = async () => {
    const nextOpen = !isOpen
    setIsOpen(nextOpen)
    if (!nextOpen || unreadCount === 0) return

    const readAt = new Date().toISOString()
    const unreadIds = notifications.filter((notification) => !notification.read_at).map((notification) => notification.id)
    const supabase = createSupabaseClient()
    const { error } = await supabase
      .from('admin_notifications')
      .update({ read_at: readAt })
      .in('id', unreadIds)

    if (error) {
      console.error('Could not mark admin notifications as read:', error.message)
      setErrorMessage('Could not mark notifications as read.')
      return
    }

    setNotifications((current) => current.map((notification) => (
      unreadIds.includes(notification.id) ? { ...notification, read_at: readAt } : notification
    )))
    setErrorMessage('')
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => void handleOpen()}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        className="relative rounded-xl p-2 text-[#756f69] transition hover:bg-black/5 hover:text-[#1e1c1a]"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-[#c0593c] text-[9px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#ded8cf] bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-[#f0ece4] px-4 py-3">
            <h2 className="text-sm font-semibold text-[#1e1c1a]">Notifications</h2>
            <span className="text-[11px] text-[#756f69]">{notifications.length} recent</span>
          </div>
          {errorMessage && (
            <p role="alert" className="px-4 py-3 text-xs text-red-700">{errorMessage}</p>
          )}
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-[#756f69]">No notifications yet.</p>
          ) : (
            <ul className="max-h-[min(24rem,65vh)] overflow-y-auto divide-y divide-[#f0ece4]">
              {notifications.map((notification) => (
                <li key={notification.id} className={`px-4 py-3 ${notification.read_at ? '' : 'bg-[#faf8f5]'}`}>
                  <p className="text-xs font-semibold text-[#1e1c1a]">{notification.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#756f69]">{notification.message}</p>
                  <time className="mt-1.5 block text-[10px] text-[#8c847c]">
                    {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                      .format(new Date(notification.created_at))}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
