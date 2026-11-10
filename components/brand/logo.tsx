import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LogoProps {
  light?: boolean
  className?: string
  href?: string
}

export function Logo({ light = false, className, href = '/' }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-2.5 text-[22px] font-semibold tracking-[-0.04em] transition hover:opacity-90',
        light ? 'text-white' : 'text-[#1e1c1a]',
        className
      )}
    >
      <span
        className={cn(
          'grid size-8 place-items-center rounded-[10px] text-sm',
          light ? 'bg-white text-[#1e1c1a]' : 'bg-[#1e1c1a] text-white'
        )}
      >
        <Sparkles size={16} />
      </span>
      booka
    </Link>
  )
}

