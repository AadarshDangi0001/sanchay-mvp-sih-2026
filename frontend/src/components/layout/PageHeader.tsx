import type { ReactNode } from 'react'
import { STEPS, stepIndex } from './steps'

export function PageHeader({
  step, title, subtitle, actions, eyebrow,
}: { step?: string; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  const i = step ? stepIndex(step) : -1
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-[280px] max-w-4xl flex-1">
        <div className="eyebrow mb-2 flex items-center gap-2">
          <span className="inline-block h-px w-6 bg-brand-500" />
          {i >= 0 ? `Step ${String(i + 1).padStart(2, '0')} / ${STEPS.length} · ${STEPS[i].long}` : eyebrow}
        </div>
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight md:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-3xl text-[15px] font-medium leading-relaxed text-ink-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
