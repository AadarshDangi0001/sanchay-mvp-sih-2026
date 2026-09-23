import type { ReactNode } from 'react'
import { Card } from './Card'

export function EmptyState({
  icon, title, body, action,
}: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <Card className="bp-dots flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-brand-200 bg-white text-brand-600 shadow-card">{icon}</div>
      <h3 className="text-lg font-bold tracking-tight">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-soft">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  )
}
