import { redirect } from 'next/navigation'
import BookaApp from '@/components/booka-app'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function ResetPasswordPage() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) redirect('/onboarding/business-setup?error=reset')

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/onboarding/business-setup?error=reset')

  return <BookaApp initialView="reset" showPrototypeNav={false} />
}
