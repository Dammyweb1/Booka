import { createClient } from '@supabase/supabase-js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function getAuthorizedClients(request: Request) {
  const authorization = request.headers.get('authorization')
  const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!accessToken || !url || !publishableKey || !serviceRoleKey) {
    throw new Error('Admin team management is not configured.')
  }
  const userClient = createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
  const { data: authData, error: authError } = await userClient.auth.getUser()
  if (authError || !authData.user) throw new Error('Unauthorized.')
  const { error: roleError } = await userClient.rpc('admin_list_platform_admins')
  if (roleError) throw new Error('Only active superadmins can manage team access.')
  const adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return { userClient, adminClient }
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  if (
    !isRecord(body) ||
    typeof body.email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) ||
    !['finance', 'operations', 'support', 'auditor'].includes(String(body.role))
  ) {
    return Response.json({ error: 'Provide a valid email address and team role.' }, { status: 400 })
  }

  try {
    const { adminClient } = await getAuthorizedClients(request)
    const email = body.email.trim().toLowerCase()
    const { data: existingAdmin, error: lookupError } = await adminClient
      .from('platform_admins')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (lookupError) throw lookupError
    if (existingAdmin) return Response.json({ error: 'This email is already a platform admin.' }, { status: 409 })

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: siteUrl ? `${siteUrl.replace(/\/+$/, '')}/admin/auth` : undefined,
    })
    if (inviteError) throw inviteError
    if (!inviteData.user) throw new Error('Supabase did not return the invited user.')

    const { error: insertError } = await adminClient.from('platform_admins').insert({
      id: inviteData.user.id,
      email,
      role: body.role,
      requires_2fa: true,
    })
    if (insertError) {
      console.error('Invited user could not be added to platform_admins:', insertError.message)
      return Response.json({
        error: 'Invite was sent, but platform admin access could not be saved. Remove or retry the invite from Supabase Auth.',
      }, { status: 500 })
    }

    return Response.json({ invited: true, email, role: body.role })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not invite admin.'
    const status = message === 'Unauthorized.' ? 401 : message.startsWith('Only active superadmins') ? 403 : 500
    return Response.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  if (!isRecord(body) || typeof body.adminId !== 'string' || typeof body.isActive !== 'boolean') {
    return Response.json({ error: 'Provide a valid admin ID and active state.' }, { status: 400 })
  }

  try {
    const { userClient, adminClient } = await getAuthorizedClients(request)
    const { error: updateError } = await userClient.rpc('admin_set_platform_admin_active', {
      p_admin_id: body.adminId,
      p_is_active: body.isActive,
    })
    if (updateError) throw updateError

    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(body.adminId, {
      ban_duration: body.isActive ? 'none' : '876000h',
    })
    if (authUpdateError) {
      console.error('Could not update deactivated admin sign-in access:', authUpdateError.message)
      if (!body.isActive) {
        return Response.json({
          error: 'Admin was deactivated, but Supabase Auth sign-in access could not be blocked. Review the user in Supabase Auth.',
        }, { status: 502 })
      }
      return Response.json({
        error: 'Admin access was reactivated in Booka, but Supabase Auth sign-in remains blocked. Review the user in Supabase Auth.',
      }, { status: 502 })
    }
    return Response.json({ updated: true, adminId: body.adminId, isActive: body.isActive })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update admin access.'
    const status = message === 'Unauthorized.' ? 401 : message.startsWith('Only active superadmins') ? 403 : 400
    return Response.json({ error: message }, { status })
  }
}
