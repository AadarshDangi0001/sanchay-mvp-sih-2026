import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'

export function StepNav({
  back, next, nextLabel = 'Continue', backLabel = 'Back', onNext, disabled, hint, extra,
}: {
  back?: string
  next?: string
  nextLabel?: string
  backLabel?: string
  onNext?: () => void
  disabled?: boolean
  hint?: ReactNode
  extra?: ReactNode
}) {
  return (
    <div className="no-print mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
      {back ? (
        <Link to={back} className="btn-outline"><ArrowLeft size={16} /> {backLabel}</Link>
      ) : <span />}
      <div className="flex flex-wrap items-center gap-3">
        {hint && <span className="text-sm font-medium text-ink-mute">{hint}</span>}
        {extra}
        {next && !onNext && (
          <Link to={next} aria-disabled={disabled} className={`btn-primary ${disabled ? 'pointer-events-none opacity-45' : ''}`}>
            {nextLabel} <ArrowRight size={16} />
          </Link>
        )}
        {onNext && (
          <button className="btn-primary" onClick={onNext} disabled={disabled}>
            {nextLabel} <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
