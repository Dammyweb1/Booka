import BookaApp from '@/components/booka-app'

export default function Page() {
  return <BookaApp initialView="onboarding" initialStep={0} showPrototypeNav={false} />
}
