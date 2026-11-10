import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSlug(name: string): string {
  if (!name) return 'studio'
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'studio'
  )
}

export function generateBusinessId(): string {
  // e.g. "bk-9a4f"
  return 'bk-' + Math.random().toString(36).substring(2, 6)
}

export function generateUniqueSlug(name: string, customId?: string): string {
  const base = generateSlug(name)
  const id = customId ? customId.replace('bk-', '').replace('biz-', '') : Math.random().toString(36).substring(2, 6)
  return `${base}-${id}`
}
