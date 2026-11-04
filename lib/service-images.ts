import type { BusinessCategory } from './booka-types'

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`

const fallbackImages: Record<BusinessCategory, string> = {
  Barbing: unsplash('1503951914875-452162b0f3f1'),
  Hairdressing: unsplash('1522337660859-02fbefca4702'),
  Spa: unsplash('1540555700478-4be289fbecef'),
}

const serviceRules: Array<{ pattern: RegExp; image: string }> = [
  { pattern: /(beard|mustache|moustache)/i, image: unsplash('1599351431202-1e0f0137899a') },
  { pattern: /(fade|haircut|cut|trim)/i, image: unsplash('1503951914875-452162b0f3f1') },
  { pattern: /(wash|shampoo|conditioning)/i, image: unsplash('1522337660859-02fbefca4702') },
  { pattern: /(silk|straight|press|blow.?dry|finish)/i, image: unsplash('1522337660859-02fbefca4702') },
  { pattern: /(braid|cornrow|loc|twist|protective)/i, image: unsplash('1595476108010-b4d1f102b26b') },
  { pattern: /(massage|deep tissue|hot stone)/i, image: unsplash('1540555700478-4be289fbecef') },
  { pattern: /(facial|glow|skin|microdermabrasion)/i, image: unsplash('1570172619644-dfd03a3d97b3') },
  { pattern: /(wax|brow|lash|makeup)/i, image: unsplash('1596178065887-1198b6148b45') },
  { pattern: /(spa|sauna|steam|ritual|relax)/i, image: unsplash('1540555700478-4be289fbecef') },
  { pattern: /(nail|manicure|pedicure)/i, image: unsplash('1604654894610-df63bc536371') },
]

export function serviceImageFor(serviceName: string, category: BusinessCategory, imagePath?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (imagePath && supabaseUrl) {
    const encodedPath = imagePath.split('/').map(encodeURIComponent).join('/')
    return `${supabaseUrl}/storage/v1/object/public/service-images/${encodedPath}`
  }

  if (category === 'Hairdressing' && /(cut|trim|wash)/i.test(serviceName)) {
    return fallbackImages.Hairdressing
  }

  const match = serviceRules.find((rule) => rule.pattern.test(serviceName))
  return match?.image ?? fallbackImages[category]
}
