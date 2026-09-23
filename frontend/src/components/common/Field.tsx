import { useEffect, useState, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Term } from './Term'

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-red-600" role="alert">
      <AlertCircle size={13} className="mt-px shrink-0" />
      {message}
    </p>
  )
}

interface NumberFieldProps {
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (v: number) => void
  className?: string
  onInvalid?: (message: string | undefined) => void
  ariaLabel?: string
  disabled?: boolean
}

/** Numeric input that only commits valid, in-range values and explains the range otherwise. */
export function NumberInput({ value, min, max, step, unit, onChange, className = '', onInvalid, ariaLabel, disabled }: NumberFieldProps) {
  const decimals = step < 1 ? String(step).split('.')[1]?.length ?? 1 : 0
  const [draft, setDraft] = useState<string>(value.toFixed(decimals))
  const [error, setError] = useState<string>()
  useEffect(() => {
    setDraft(value.toFixed(decimals))
    setError(undefined)
  }, [value, decimals])

  const commit = (text: string) => {
    setDraft(text)
    const v = parseFloat(text)
    let msg: string | undefined
    if (text.trim() === '' || !Number.isFinite(v)) msg = 'Enter a number.'
    else if (v < min || v > max) msg = `Must be between ${min} and ${max}${unit ? ' ' + unit : ''}.`
    setError(msg)
    onInvalid?.(msg)
    if (!msg) onChange(v)
  }

  return (
    <div className={className}>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          aria-label={ariaLabel}
          aria-invalid={!!error}
          disabled={disabled}
          value={draft}
          onChange={(e) => commit(e.target.value)}
          onBlur={() => {
            setDraft(value.toFixed(decimals))
            setError(undefined)
            onInvalid?.(undefined)
          }}
          className={`input num !py-1.5 pr-9 text-right text-sm font-semibold disabled:bg-slate-50 disabled:text-slate-400 ${error ? 'input-error' : ''}`}
        />
        {unit && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-mute">{unit}</span>}
      </div>
      <FieldError message={error} />
    </div>
  )
}

interface SliderFieldProps {
  label: ReactNode
  term?: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (v: number) => void
  issue?: string
  issueLevel?: 'error' | 'warn'
  disabled?: boolean
  hint?: string
}

export function SliderField({ label, term, value, min, max, step, unit, onChange, issue, issueLevel = 'error', disabled, hint }: SliderFieldProps) {
  const fill = ((Math.min(Math.max(value, min), max) - min) / (max - min || 1)) * 100
  return (
    <div className={disabled ? 'opacity-50' : ''}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-[13px] font-semibold text-ink-soft">{term ? <Term k={term}>{label}</Term> : label}</label>
        <NumberInput value={value} min={min} max={max} step={step} unit={unit} onChange={onChange} className="w-[104px]" disabled={disabled} ariaLabel={typeof label === 'string' ? label : undefined} />
      </div>
      <input
        type="range" className="slider" min={min} max={max} step={step} value={Math.min(Math.max(value, min), max)}
        disabled={disabled} onChange={(e) => onChange(parseFloat(e.target.value))} style={{ ['--fill' as string]: `${fill}%` }}
      />
      {hint && <p className="mt-1 text-[11px] font-medium text-ink-mute">{hint}</p>}
      {issue && (
        <p className={`mt-1.5 flex items-start gap-1.5 text-xs font-semibold ${issueLevel === 'error' ? 'text-red-600' : 'text-amber-700'}`}>
          <AlertCircle size={13} className="mt-px shrink-0" />
          {issue}
        </p>
      )}
    </div>
  )
}
