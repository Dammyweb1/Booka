import BookaApp from '@/components/booka-app'
import { getOnboardingFeedback } from '@/lib/onboarding-feedback'

type BusinessPageProps = {
  searchParams: Promise<{ error?: string | string[] }>
}

export default async function BusinessPage({ searchParams }: BusinessPageProps) {
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
