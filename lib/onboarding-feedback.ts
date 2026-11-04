export type OnboardingFeedback = {
  success: boolean
  message: string
}

const feedbackByError: Record<string, OnboardingFeedback> = {
  confirmation: {
    success: false,
    message: 'That confirmation link is invalid or has expired. Sign in if you already confirmed your email, or create your account again.',
  },
  schema: {
    success: false,
    message: 'Your Supabase database is missing the Booka tables, so your business profile could not be loaded. Run the database migration (pnpm db:push), then sign in again.',
  },
  reset: {
    success: false,
    message: 'That password reset link is invalid or has expired. Request a new one from the sign-in form.',
  },
}

export function getOnboardingFeedback(error: string | string[] | undefined): OnboardingFeedback | null {
  const key = Array.isArray(error) ? error[0] : error
  return key ? feedbackByError[key] ?? null : null
}
