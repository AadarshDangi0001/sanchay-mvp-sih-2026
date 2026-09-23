import type { ReactNode } from 'react'
import { AlertTriangle, FlaskConical, Sparkles } from 'lucide-react'

export function DemoBadge({ children = 'Demo Simulation – Illustrative Results', className = '' }: { children?: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-amber-300/70 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 ${className}`}>
      <FlaskConical size={13} />
      {children}
    </span>
  )
}

export function AiBadge({ children = 'AI Optimization Demo', className = '' }: { children?: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-aqua-300 bg-aqua-50 px-3 py-1 text-xs font-bold text-aqua-700 ${className}`}>
      <Sparkles size={13} />
      {children}
    </span>
  )
}

export function Notice({ tone = 'info', children, className = '' }: { tone?: 'info' | 'warn' | 'error'; children: ReactNode; className?: string }) {
  const map = {
    info: 'border-brand-200 bg-brand-50 text-brand-800',
    warn: 'border-amber-200 bg-amber-50 text-amber-900',
    error: 'border-red-200 bg-red-50 text-red-800',
  }
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium leading-snug ${map[tone]} ${className}`}>
      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  )
}
