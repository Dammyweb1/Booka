'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Logo } from '@/components/brand/logo'
import { AdminNotificationBell } from '@/components/admin/notification-bell'
import {
  Building2,
  FileText,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Store,
  X,
  Users,
  WalletCards,
  LifeBuoy,
  UserRound,
  ChartNoAxesCombined,
  Activity,
} from 'lucide-react'
import { createAdminSupabaseClient as createSupabaseClient } from '@/lib/supabase'
import {
  clearAdminSessionActivity,
  getAdminSessionIdleTimeRemaining,
  markAdminSessionActivity,
} from '@/lib/admin-session'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [adminEmail, setAdminEmail] = useState('Admin')
  const [adminRole, setAdminRole] = useState('superadmin')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [verificationError, setVerificationError] = useState('')

  // Pages that don't need the admin sidebar
  const isPublicAdminAuthPage = pathname === '/admin/auth' || pathname === '/admin/reset-password'

  useEffect(() => {
    let active = true
    let isSigningOut = false
    let idleTimer: number | undefined
    const supabase = createSupabaseClient()

    const signOutForIdleTimeout = async () => {
      if (!active || isSigningOut) return
      isSigningOut = true
      try {
        const { error } = await supabase.auth.signOut()
        if (error) console.error('Admin idle-timeout sign-out failed:', error.message)
      } catch (error) {
        console.error('Admin idle-timeout sign-out failed:', error)
      } finally {
        clearAdminSessionActivity()
        if (active) router.replace('/admin/auth')
      }
    }

    const scheduleIdleTimeout = () => {
      if (idleTimer !== undefined) window.clearTimeout(idleTimer)
      idleTimer = window.setTimeout(
        () => void signOutForIdleTimeout(),
        getAdminSessionIdleTimeRemaining()
      )
    }

    const recordActivity = () => {
      if (!active || isSigningOut) return
      markAdminSessionActivity()
      scheduleIdleTimeout()
    }

    if (isPublicAdminAuthPage) {
      setIsLoading(false)
      return () => {
        active = false
      }
    }

    const verifyAdminClearance = async () => {
      try {
        if (getAdminSessionIdleTimeRemaining() <= 0) {
          await signOutForIdleTimeout()
          return
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!user) {
          clearAdminSessionActivity()
          router.replace('/admin/auth')
          return
        }

        setAdminEmail(user.email?.split('@')[0] || 'Admin')

        // Query platform_admins
        const { data: adminRecord, error: adminError } = await supabase
          .from('platform_admins')
          .select('role, is_active, requires_2fa')
          .eq('id', user.id)
          .maybeSingle()

        if (adminError) throw adminError
        if (!adminRecord?.is_active || !adminRecord?.role || ![
          'superadmin', 'finance', 'operations', 'support', 'auditor',
        ].includes(adminRecord.role)) {
          const { error } = await supabase.auth.signOut()
          if (error) console.error('Inactive admin sign-out failed:', error.message)
          clearAdminSessionActivity()
          router.replace('/admin/auth')
          return
        }

        if (adminRecord.requires_2fa) {
          const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
          if (assuranceError) throw assuranceError
          if (assurance.currentLevel !== 'aal2') {
            router.replace('/admin/auth')
            return
          }
        }

        markAdminSessionActivity()
        scheduleIdleTimeout()
        window.addEventListener('pointerdown', recordActivity, { passive: true })
        window.addEventListener('keydown', recordActivity)
        window.addEventListener('scroll', recordActivity, { passive: true })
        setAdminRole(adminRecord.role)
        setIsAuthorized(true)
        setVerificationError('')
      } catch (error) {
        console.error('Admin clearance verification failed:', error)
        if (active) {
          setVerificationError('Could not verify admin access right now. Your session has not been signed out. Retry verification.')
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void verifyAdminClearance()
    return () => {
      active = false
      if (idleTimer !== undefined) window.clearTimeout(idleTimer)
      window.removeEventListener('pointerdown', recordActivity)
      window.removeEventListener('keydown', recordActivity)
      window.removeEventListener('scroll', recordActivity)
    }
  }, [pathname, isPublicAdminAuthPage, router])

  if (isPublicAdminAuthPage) {
    return <>{children}</>
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#141f19] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-[#528361] border-t-transparent animate-spin" />
          <p className="font-mono text-xs text-[#8ea396] tracking-wider uppercase">
            Verifying Mission Control Clearance...
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    if (verificationError) {
      return (
        <main className="grid min-h-screen place-items-center bg-[#141f19] px-6 text-center text-white">
          <div className="max-w-md">
            <h1 className="text-xl font-semibold">Admin verification unavailable</h1>
            <p role="alert" className="mt-3 text-sm text-[#f0b4a5]">{verificationError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-full bg-[#528361] px-5 py-3 text-sm font-semibold text-white"
            >
              Retry verification
            </button>
          </div>
        </main>
      )
    }
    return null
  }

  const handleSignOut = async () => {
    const supabase = createSupabaseClient()
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Admin sign-out failed:', error.message)
    clearAdminSessionActivity()
    router.replace('/admin/auth')
  }

  const navItems = [
    {
      group: 'OPERATIONS',
      items: [
        { label: 'Overview', href: '/admin', icon: LayoutDashboard, exact: true, roles: ['superadmin', 'finance', 'operations', 'support', 'auditor'] },
        { label: 'Studios', href: '/admin/studios', icon: Store, roles: ['superadmin', 'finance', 'operations', 'support'] },
        { label: 'Split ledger', href: '/admin/split-ledger', icon: Layers, roles: ['superadmin', 'finance', 'operations', 'support'] },
        { label: 'Payouts', href: '/admin/payouts', icon: WalletCards, roles: ['superadmin', 'finance', 'operations'] },
        { label: 'Customers', href: '/admin/customers', icon: UserRound, roles: ['superadmin', 'operations', 'support'] },
        { label: 'Support', href: '/admin/support', icon: LifeBuoy, roles: ['superadmin', 'operations', 'support'] },
      ],
    },
    {
      group: 'GOVERNANCE',
      items: [
        { label: 'Audit logs', href: '/admin/audit-log', icon: FileText, roles: ['superadmin', 'auditor'] },
        { label: 'Financial reports', href: '/admin/reports', icon: ChartNoAxesCombined, roles: ['superadmin', 'finance', 'auditor'] },
        { label: 'System health', href: '/admin/health', icon: Activity, roles: ['superadmin', 'operations', 'finance', 'auditor'] },
        { label: 'Team access', href: '/admin/team', icon: Users, roles: ['superadmin'] },
        { label: 'Platform settings', href: '/admin/settings', icon: Settings, roles: ['superadmin'] },
      ],
    },
  ]

  return (
    <div className="flex min-h-dvh bg-[#faf8f5] text-[#1e1c1a]">
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}
      {/* ========================================================================= */}
      {/* PERSISTENT FOREST DARK SIDEBAR                                            */}
      {/* ========================================================================= */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex h-dvh w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-[#203027] bg-[#141f19] p-5 text-[#f8f5f0] transition-transform md:sticky md:top-0 md:bottom-auto md:h-auto md:min-h-dvh md:self-stretch md:translate-x-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          {/* Logo & Category */}
          <div className="flex items-center justify-between pb-6 border-b border-white/10">
            <Logo light href="/admin" />
            <button type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" className="rounded-lg p-1 text-[#8ea396] hover:bg-white/10 md:hidden">
              <X className="size-5" />
            </button>
            <span className="hidden font-mono text-[9px] uppercase tracking-[0.2em] text-[#8ea396] md:inline">
              MISSION CONTROL
            </span>
          </div>

          {/* Workspace Card */}
          <div className="mt-5 p-3 rounded-xl bg-[#1b2b23] border border-white/10 flex items-center gap-3">
            <div className="size-8 rounded-lg bg-[#273d32] flex items-center justify-center text-[#8ed8a3]">
              <Building2 className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">Booka Platform</p>
              <p className="text-[10px] text-[#8ea396] truncate">Superadmin workspace</p>
            </div>
          </div>

          {/* Navigation Groups */}
          <nav className="mt-6 space-y-6">
            {navItems.map((group) => (
              group.items.some((item) => item.roles.includes(adminRole)) &&
              <div key={group.group}>
                <p className="text-[9px] font-mono tracking-[0.2em] text-[#6c8576] uppercase font-bold px-2 mb-2">
                  {group.group}
                </p>
                <div className="space-y-1">
                  {group.items.filter((item) => item.roles.includes(adminRole)).map((item) => {
                    const isActive = item.exact
                      ? pathname === item.href
                      : pathname.startsWith(item.href) && item.href !== '/admin'
                    const Icon = item.icon

                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setMobileNavOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-[#21352a] text-white font-semibold border border-white/10 shadow-sm'
                            : 'text-[#9fb0a5] hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`size-4 ${isActive ? 'text-[#e5b882]' : 'text-[#7d9486]'}`} />
                          <span>{item.label}</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Status & Admin Profile */}
        <div className="pt-6 space-y-4 border-t border-white/10">
          {/* Admin Profile */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 rounded-lg bg-[#273d32] text-[#8ed8a3] flex items-center justify-center shrink-0">
                <ShieldCheck className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white capitalize truncate">{adminEmail}</p>
                <p className="text-[10px] text-[#8ea396] truncate">Platform {adminRole}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="p-1.5 rounded-lg text-[#8ea396] hover:bg-white/10 hover:text-white transition-colors"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN VIEWPORT                                                             */}
      {/* ========================================================================= */}
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col bg-[#faf8f5]">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[#ded8cf]/60 bg-[#faf8f5]/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-lg p-2 text-[#756f69] hover:bg-black/5 md:hidden"
            >
              <Menu className="size-5" />
            </button>
            <div className="min-w-0 leading-tight">
              <p className="max-w-40 truncate whitespace-nowrap text-sm text-[#756f69]">
                Welcome back, <span className="font-semibold capitalize text-[#1e1c1a]">{adminEmail}</span>
              </p>
            </div>
          </div>
          <AdminNotificationBell />
        </header>
        {children}
      </div>
    </div>
  )
}
