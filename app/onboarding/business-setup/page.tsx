import BookaApp from '@/components/booka-app'
import { getOnboardingFeedback } from '@/lib/onboarding-feedback'

type BusinessSetupPageProps = {
  searchParams: Promise<{ error?: string | string[] }>
}

export default async function BusinessSetupPage({ searchParams }: BusinessSetupPageProps) {
  const { error } = await searchParams

  return (
    <BookaApp
      initialView="onboarding"
      initialStep={0}
      showPrototypeNav={false}
      initialFeedback={getOnboardingFeedback(error)}
    />
  )
}
