'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, ChevronLeft, Eye, EyeOff, Scissors, Sparkles, Upload, Wand2 } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { createSupabaseClient } from '@/lib/supabase'
import { cn, generateBusinessId, generateUniqueSlug } from '@/lib/utils'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [businessData, setBusinessData] = useState({
    businessName: '',
    ownerFirstName: '',
    ownerLastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    logoUrl: '',
  })
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [confirmationRequired, setConfirmationRequired] = useState(false)

  const serviceOptions = [
    { name: 'Barbing', detail: 'Cuts, fades & grooming', icon: Scissors },
    { name: 'Spa', detail: 'Treatments & wellness', icon: Sparkles },
    { name: 'Hair dressing', detail: 'Styling, color & care', icon: Wand2 },
  ]

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 100 * 1024) {
      setSubmitError('Please choose an image file smaller than 100 KB.')
      return
    }
    setSubmitError('')
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64Url = event.target?.result as string
      setBusinessData((prev) => ({ ...prev, logoUrl: base64Url }))
    }
    reader.readAsDataURL(file)
  }

  const toggleService = (name: string) => {
    setSelectedServices((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    )
  }

  const handleComplete = async () => {
    setSubmitError('')
    setConfirmationRequired(false)

    const email = businessData.email.trim()
    if (!email || !businessData.password) {
      setSubmitError('Enter your email address and password to create your account.')
      setStep(2)
      return
    }
    if (businessData.password !== businessData.confirmPassword) {
      setSubmitError('Your passwords do not match.')
      setStep(2)
      return
    }

    setIsSubmitting(true)
    const uniqueId = generateBusinessId()
    const businessName = businessData.businessName.trim() || 'My Studio'
    const ownerName = `${businessData.ownerFirstName.trim()} ${businessData.ownerLastName.trim()}`.trim() || 'Studio Owner'
    const uniqueSlug = generateUniqueSlug(businessName, uniqueId)

    try {
      const supabase = createSupabaseClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password: businessData.password,
        options: {
          data: {
            business_id: uniqueId,
            business_slug: uniqueSlug,
            business_name: businessName,
            owner_name: ownerName,
            owner_first_name: businessData.ownerFirstName.trim(),
            owner_last_name: businessData.ownerLastName.trim(),
            phone: businessData.phone.trim(),
            address: businessData.address.trim(),
            selected_services: selectedServices,
            logo_url: businessData.logoUrl,
          },
        },
      })

      if (error) {
        setSubmitError(error.message)
        return
      }

      if (data.session) {
        if (businessData.logoUrl && data.user) {
          try {
            const { error: logoError } = await supabase.from('businesses')
              .update({ logo_url: businessData.logoUrl })
              .eq('owner_id', data.user.id)
            if (logoError) throw logoError
          } catch (error) {
            const message = error instanceof Error ? error.message : 'unknown error'
            setSubmitError(`Your account was created, but the logo could not be saved: ${message}`)
            return
          }
        }
        router.push('/welcome')
      } else {
        setConfirmationRequired(true)
        if (businessData.logoUrl) {
          setSubmitError('After confirming your email and logging in, upload your logo from Dashboard → Settings.')
        }
      }
    } catch (error) {
      console.error('Account registration failed:', error)
      setSubmitError('Could not create your account. Check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen lg:h-screen lg:overflow-hidden bg-[#f8f5f0] text-[#1e1c1a] no-scrollbar">
      {/* Dark Sidebar Panel (Present on desktop across all steps) */}
      <aside className="hidden w-[38%] flex-col justify-between bg-[#1e1c1a] p-8 lg:p-10 text-white lg:flex h-full no-scrollbar">
        <Logo light />
        <div>
          <p className="eyebrow text-[#efb49f]">
            {step === 1 && '01 / Registration'}
            {step === 2 && '02 / Profile & Security'}
            {step === 3 && '03 / Services'}
          </p>
          <h1 className="mt-5 max-w-[390px] text-5xl lg:text-6xl font-medium leading-[.95] tracking-[-.07em]">
            Build your <em className="font-serif not-italic text-[#e89b80]">place</em> on Booka.
          </h1>
          <p className="mt-5 max-w-[360px] text-sm lg:text-base leading-6 lg:leading-7 text-white/60">
            {step === 1 && 'Set up your details and let customers discover your services with confidence.'}
            {step === 2 && 'Upload your business logo, address, and secure your owner account.'}
            {step === 3 && 'Choose the services you offer to start accepting appointments immediately.'}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/40">
          <span className="size-2 rounded-full bg-[#e89b80]" />
          Takes about 3 minutes · Booka for business
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex flex-1 flex-col justify-between h-full overflow-y-auto no-scrollbar">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 lg:px-10 lg:py-5">
          <div className="flex items-center gap-2">
            <Logo className="sm:hidden" />
            <button
              onClick={() => {
                if (step > 1) setStep(step === 3 ? 2 : 1)
                else router.push('/')
              }}
              className="hidden items-center gap-1.5 text-sm font-semibold text-[#1e1c1a] transition hover:text-[#d46b4f] sm:inline-flex"
            >
              <ChevronLeft size={18} /> Back
            </button>
          </div>
          <div className="flex items-center gap-4 text-sm text-[#8c847c]">
            <span className="hidden sm:inline">Step {step} of 3</span>
            <span className="hidden text-xs sm:inline">·</span>
            <span>
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-[#1e1c1a] hover:underline">
                Log in
              </Link>
            </span>
          </div>
        </div>

        {/* Dynamic Form Area */}
        <div className="mx-auto w-full max-w-xl px-6 py-2 my-auto no-scrollbar">
          {/* Progress bar pills */}
          <div className="mb-5 flex gap-2">
            <span className={cn('h-1.5 w-16 rounded-full transition-colors', step >= 1 ? 'bg-[#d46b4f]' : 'bg-[#ded8cf]')} />
            <span className={cn('h-1.5 w-16 rounded-full transition-colors', step >= 2 ? 'bg-[#d46b4f]' : 'bg-[#ded8cf]')} />
            <span className={cn('h-1.5 w-16 rounded-full transition-colors', step >= 3 ? 'bg-[#d46b4f]' : 'bg-[#ded8cf]')} />
          </div>

          {submitError && (
            <p role="alert" className="mb-4 rounded-xl bg-[#fff0eb] px-4 py-3 text-sm text-[#a9432e]">
              {submitError}
            </p>
          )}
          {confirmationRequired && (
            <p role="status" className="mb-4 rounded-xl bg-[#edf6ee] px-4 py-3 text-sm text-[#315d3b]">
              Account created. Check your email to confirm your address, then{' '}
              <Link href="/login" className="font-semibold underline">log in</Link>.
            </p>
          )}

          {/* STEP 1: BUSINESS & OWNER DETAILS */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <p className="eyebrow text-[#d46b4f]">01 / Your details</p>
                <h2 className="mt-2 text-3xl lg:text-4xl font-medium tracking-[-.06em]">Tell us about your place.</h2>
                <p className="mt-1 text-sm text-[#756f69]">
                  Create the owner profile you'll use to manage bookings and receive payments.
                </p>
              </div>

              <form
                className="space-y-3.5"
                onSubmit={(e) => {
                  e.preventDefault()
                  setSubmitError('')
                  if (
                    !businessData.businessName.trim() ||
                    !businessData.ownerFirstName.trim() ||
                    !businessData.ownerLastName.trim() ||
                    !businessData.email.trim() ||
                    !businessData.phone.trim()
                  ) {
                    setSubmitError('Complete all required fields before continuing.')
                    return
                  }
                  setStep(2)
                }}
              >
                {/* Business name - full width */}
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Business name</span>
                  <input
                    required
                    value={businessData.businessName}
                    onChange={(e) => setBusinessData({ ...businessData, businessName: e.target.value })}
                    placeholder="e.g. The Common Room"
                    className="w-full rounded-[14px] border border-[#ded8cf] bg-white px-4 py-2.5 text-sm transition focus:border-[#d46b4f] focus:outline-none"
                  />
                </label>

                {/* First name & Last name beside each other */}
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-sm font-medium">First name</span>
                    <input
                      required
                      value={businessData.ownerFirstName}
                      onChange={(e) => setBusinessData({ ...businessData, ownerFirstName: e.target.value })}
                      placeholder="First name"
                      className="w-full rounded-[14px] border border-[#ded8cf] bg-white px-4 py-2.5 text-sm transition focus:border-[#d46b4f] focus:outline-none"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium">Last name</span>
                    <input
                      required
                      value={businessData.ownerLastName}
                      onChange={(e) => setBusinessData({ ...businessData, ownerLastName: e.target.value })}
                      placeholder="Last name"
                      className="w-full rounded-[14px] border border-[#ded8cf] bg-white px-4 py-2.5 text-sm transition focus:border-[#d46b4f] focus:outline-none"
                    />
                  </label>
                </div>

                {/* Contact: Email & Phone beside each other */}
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-sm font-medium">Email address</span>
                    <input
                      type="email"
                      required
                      value={businessData.email}
                      onChange={(e) => setBusinessData({ ...businessData, email: e.target.value })}
                      placeholder="owner@yourplace.com"
                      className="w-full rounded-[14px] border border-[#ded8cf] bg-white px-4 py-2.5 text-sm transition focus:border-[#d46b4f] focus:outline-none"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium">Phone number</span>
                    <input
                      type="tel"
                      required
                      value={businessData.phone}
                      onChange={(e) => setBusinessData({ ...businessData, phone: e.target.value })}
                      placeholder="+234 800 000 0000"
                      className="w-full rounded-[14px] border border-[#ded8cf] bg-white px-4 py-2.5 text-sm transition focus:border-[#d46b4f] focus:outline-none"
                    />
                  </label>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#d46b4f] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#c6604f]"
                  >
                    Next: Profile & Security <ArrowRight size={15} />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: PROFILE & SECURITY (Logo upload, Address, Password, Confirm Password) */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <p className="eyebrow text-[#d46b4f]">02 / Profile & Security</p>
                <h2 className="mt-2 text-3xl lg:text-4xl font-medium tracking-[-.06em]">Profile & security.</h2>
                <p className="mt-1 text-sm text-[#756f69]">
                  Upload your brand logo, add your studio address, and set a password to secure your owner account.
                </p>
              </div>

              <form
                className="space-y-3.5"
                onSubmit={(e) => {
                  e.preventDefault()
                  setSubmitError('')
                  if (!businessData.logoUrl) {
                    setSubmitError('Upload your business logo before continuing.')
                    return
                  }
                  if (!businessData.address.trim()) {
                    setSubmitError('Enter your business address before continuing.')
                    return
                  }
                  if (!businessData.password || !businessData.confirmPassword) {
                    setSubmitError('Enter and confirm your password before continuing.')
                    return
                  }
                  if (businessData.password !== businessData.confirmPassword) {
                    setSubmitError('Your passwords do not match.')
                    return
                  }
                  setStep(3)
                }}
              >
                {/* Upload Logo Card */}
                <div>
                  <span className="mb-1 block text-sm font-medium">Brand logo <span className="text-[#d46b4f]">*</span></span>
                  <div className="flex items-center gap-4 rounded-2xl border border-dashed border-[#ded8cf] bg-[#fffaf8] p-3">
                    <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#ded8cf] bg-white">
                      {businessData.logoUrl ? (
                        <img src={businessData.logoUrl} alt="Logo preview" className="size-full object-contain p-1" />
                      ) : (
                        <Upload size={18} className="text-[#8c847c]" />
                      )}
                    </div>
                    <div className="flex flex-1 items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#1e1c1a]">Business Logo</p>
                        <p className="text-xs text-[#8c847c]">PNG, JPG, or SVG for your booking page</p>
                      </div>
                      <label className="cursor-pointer rounded-full border border-[#ded8cf] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#1e1c1a] shadow-sm transition hover:border-[#d46b4f] hover:text-[#d46b4f]">
                        <span>{businessData.logoUrl ? 'Change logo' : 'Upload logo'}</span>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" aria-required="true" />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Studio / business address */}
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Studio / business address</span>
                  <input
                    required
                    value={businessData.address}
                    onChange={(e) => setBusinessData({ ...businessData, address: e.target.value })}
                    placeholder="e.g. 14 Admiralty Way, Lekki Phase 1, Lagos"
                    className="w-full rounded-[14px] border border-[#ded8cf] bg-white px-4 py-2.5 text-sm transition focus:border-[#d46b4f] focus:outline-none"
                  />
                </label>

                {/* Password & Confirm password beside each other */}
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-sm font-medium">Password</span>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={businessData.password}
                        onChange={(e) => setBusinessData({ ...businessData, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full rounded-[14px] border border-[#ded8cf] bg-white px-4 py-2.5 pr-10 text-sm transition focus:border-[#d46b4f] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8c847c] transition hover:text-[#1e1c1a]"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-sm font-medium">Confirm password</span>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={businessData.confirmPassword}
                        onChange={(e) => setBusinessData({ ...businessData, confirmPassword: e.target.value })}
                        placeholder="••••••••"
                        className="w-full rounded-[14px] border border-[#ded8cf] bg-white px-4 py-2.5 pr-10 text-sm transition focus:border-[#d46b4f] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8c847c] transition hover:text-[#1e1c1a]"
                        aria-label="Toggle confirm password visibility"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </label>
                </div>

                {businessData.password && businessData.confirmPassword && businessData.password !== businessData.confirmPassword && (
                  <p className="text-xs font-medium text-[#d46b4f]">Passwords do not match</p>
                )}

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-full border border-[#ded8cf] px-5 py-3 text-sm font-semibold transition hover:bg-white"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#d46b4f] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#c6604f]"
                  >
                    Next: Choose services <ArrowRight size={15} />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: SERVICES (LAST ONBOARDING PAGE) */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <p className="eyebrow text-[#d46b4f]">03 / Services</p>
                <h2 className="mt-2 text-3xl lg:text-4xl font-medium tracking-[-.06em]">What do you offer?</h2>
                <p className="mt-1 text-sm text-[#756f69]">
                  Choose every service clients can book with you. You can adjust prices and add custom services inside the dashboard anytime.
                </p>
              </div>

              {/* Service cards */}
              <div className="grid gap-3">
                {serviceOptions.map(({ name, detail, icon: Icon }) => {
                  const isSelected = selectedServices.includes(name)
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleService(name)}
                      className={cn(
                        'flex items-center gap-4 rounded-2xl border p-4 text-left transition',
                        isSelected
                          ? 'border-[#d46b4f] bg-[#fff8f5] shadow-[0_8px_20px_rgba(212,107,79,.10)]'
                          : 'border-[#ded8cf] bg-white hover:border-[#caa08f]'
                      )}
                    >
                      <span
                        className={cn(
                          'grid size-10 place-items-center rounded-xl',
                          isSelected ? 'bg-[#d46b4f] text-white' : 'bg-[#f1ebe4] text-[#d46b4f]'
                        )}
                      >
                        <Icon size={18} />
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-semibold">{name}</span>
                        <span className="mt-0.5 block text-xs text-[#8c847c]">{detail}</span>
                      </span>
                      <span
                        className={cn(
                          'grid size-5 place-items-center rounded-md border transition',
                          isSelected
                            ? 'border-[#d46b4f] bg-[#d46b4f] text-white shadow-sm'
                            : 'border-[#cfc7be] bg-white text-transparent hover:border-[#8c847c]'
                        )}
                      >
                        <Check size={12} strokeWidth={3} />
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Navigation buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-full border border-[#ded8cf] px-5 py-3 text-sm font-semibold transition hover:bg-white"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={selectedServices.length === 0 || isSubmitting || confirmationRequired}
                  onClick={handleComplete}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#1e1c1a] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#d46b4f] disabled:opacity-40"
                >
                  {isSubmitting ? 'Creating account...' : confirmationRequired ? 'Account created' : 'Complete registration'}
                  {!isSubmitting && !confirmationRequired && <ArrowRight size={15} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="py-3 px-6 text-center text-xs text-[#8c847c]">
          By signing up, you agree to Booka&apos;s Owner Terms & Privacy Policy.
        </div>
      </main>
    </div>
  )
}