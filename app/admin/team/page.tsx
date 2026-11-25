'use client'

import { FormEvent, useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'

interface AdminUser {
  admin_id: string
  email: string
  role: 'superadmin' | 'finance' | 'operations' | 'support' | 'auditor'
  requires_2fa: boolean
  last_seen_at: string | null
  created_at: string
  is_active: boolean
}

const formatTimestamp = (value: string | null) => value
  ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : 'Never'

export default function AdminTeamPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Exclude<AdminUser['role'], 'superadmin'>>('support')
  const [isInviting, setIsInviting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const supabase = createSupabaseClient()
        const { data, error } = await supabase.rpc('admin_list_platform_admins_v2')
        if (error) throw error
        if (active) setAdmins((data ?? []) as AdminUser[])
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Could not load team access.')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  const updateAdmin = async (admin: AdminUser, role: AdminUser['role'], requires2FA: boolean) => {
    setErrorMessage('')
    try {
      const supabase = createSupabaseClient()
      const { error } = await supabase.rpc('admin_set_platform_admin_role', {
        p_admin_id: admin.admin_id,
        p_role: role,
        p_requires_2fa: requires2FA,
      })
      if (error) throw error
      setAdmins((current) => current.map((item) => item.admin_id === admin.admin_id
        ? { ...item, role, requires_2fa: requires2FA }
        : item))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update team access.')
    }
  }

  const inviteAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsInviting(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const supabase = createSupabaseClient()
      const { data } = await supabase.auth.getSession()
      if (!data.session?.access_token) throw new Error('Your admin session has expired.')
      const response = await fetch('/api/admin/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || 'Could not invite admin.')
      setInviteEmail('')
      const { data: refreshedAdmins, error: refreshError } = await supabase.rpc('admin_list_platform_admins_v2')
      if (refreshError) throw refreshError
      setAdmins((refreshedAdmins ?? []) as AdminUser[])
      setSuccessMessage('Invitation sent. The admin can sign in after accepting.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not invite admin.')
    } finally {
      setIsInviting(false)
    }
  }

  const setAdminActive = async (admin: AdminUser) => {
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const supabase = createSupabaseClient()
      const { data } = await supabase.auth.getSession()
      if (!data.session?.access_token) throw new Error('Your admin session has expired.')
      const response = await fetch('/api/admin/team', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ adminId: admin.admin_id, isActive: !admin.is_active }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || 'Could not update admin access.')
      setAdmins((current) => current.map((item) => item.admin_id === admin.admin_id
        ? { ...item, is_active: !admin.is_active }
        : item))
      setSuccessMessage(`Admin access ${admin.is_active ? 'deactivated' : 'reactivated'}.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update admin access.')
    }
  }

  return (
    <div className="min-w-0 flex-1 p-4 text-[#1e1c1a] sm:p-8 lg:p-10">
      <div className="border-b border-[#ded8cf]/60 pb-6">
        <p className="text-xs text-[#756f69]">Governance / Team access</p>
        <h1 className="mt-3 text-2xl font-medium tracking-tight sm:text-3xl">Team access</h1>
        <p className="mt-1 text-sm text-[#756f69]">Control platform roles and MFA requirements.</p>
      </div>

      {errorMessage && (
        <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </p>
      )}
      {successMessage && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{successMessage}</p>}

      <form onSubmit={inviteAdmin} className="mt-6 grid gap-3 rounded-2xl border border-[#ded8cf] bg-white p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end sm:p-5">
        <label className="text-xs font-medium">Invite by email
          <input required type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-[#ded8cf] px-3" />
        </label>
        <label className="text-xs font-medium">Role
          <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as typeof inviteRole)} className="mt-1.5 h-10 rounded-lg border border-[#ded8cf] bg-white px-3">
            <option value="finance">Finance</option><option value="operations">Operations</option><option value="support">Support</option><option value="auditor">Auditor</option>
          </select>
        </label>
        <button type="submit" disabled={isInviting} className="h-10 rounded-xl bg-[#c0593c] px-4 text-xs font-semibold text-white disabled:opacity-50">
          {isInviting ? 'Sending invite…' : 'Invite admin'}
        </button>
      </form>

      <section className="mt-6 rounded-2xl border border-[#ded8cf] bg-white p-4 shadow-sm sm:p-6">
        {isLoading ? (
          <p className="py-12 text-center text-sm text-[#756f69]">Loading team access...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#f0ece4] text-[#8c847c]">
                  <th className="py-3.5 font-medium">Admin</th>
                  <th className="py-3.5 font-medium">Role</th>
                  <th className="py-3.5 font-medium">MFA</th>
                  <th className="py-3.5 font-medium">Last seen</th>
                  <th className="py-3.5 font-medium">Added</th>
                  <th className="py-3.5 text-right font-medium">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f1ea]">
                {admins.map((admin) => (
                  <tr key={admin.admin_id}>
                    <td className="py-4">
                      <p className={`font-semibold ${admin.is_active ? '' : 'text-[#8c847c]'}`}>{admin.email}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-[#8c847c]">{admin.admin_id}</p>
                    </td>
                    <td className="py-4">
                      <select
                        value={admin.role}
                        onChange={(event) => void updateAdmin(
                          admin,
                          event.target.value as AdminUser['role'],
                          admin.requires_2fa
                        )}
                        className="rounded-lg border border-[#ded8cf] bg-[#faf8f5] px-2 py-2"
                      >
                        <option value="superadmin">Superadmin</option>
                        <option value="finance">Finance</option>
                        <option value="operations">Operations</option>
                        <option value="support">Support</option>
                        <option value="auditor">Auditor</option>
                      </select>
                    </td>
                    <td className="py-4">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={admin.requires_2fa}
                          onChange={(event) => void updateAdmin(admin, admin.role, event.target.checked)}
                          className="size-4 accent-[#c0593c]"
                        />
                        <span>{admin.requires_2fa ? 'Required' : 'Optional'}</span>
                      </label>
                    </td>
                    <td className="py-4 text-[#756f69]">{formatTimestamp(admin.last_seen_at)}</td>
                    <td className="py-4 text-[#756f69]">{formatTimestamp(admin.created_at)}</td>
                    <td className="py-4 text-right">
                      <button type="button" onClick={() => void setAdminActive(admin)} className={`rounded-lg px-3 py-2 text-[11px] font-medium ${admin.is_active ? 'border border-red-200 text-red-700' : 'bg-[#1e1c1a] text-white'}`}>
                        {admin.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
