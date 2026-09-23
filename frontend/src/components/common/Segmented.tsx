import type { ReactNode } from 'react'

export function Segmented<T extends string>({
  value, onChange, options, className = '', size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: { id: T; label: ReactNode; icon?: ReactNode; disabled?: boolean }[]
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div className={`inline-flex rounded-xl border border-line bg-slate-50 p-1 ${className}`} role="tablist">
      {options.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={active}
            disabled={o.disabled}
            onClick={() => onChange(o.id)}
            className={`flex items-center justify-center gap-1.5 rounded-lg font-semibold transition disabled:opacity-40 ${
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-[13px]'
            } ${active ? 'bg-white text-brand-700 shadow-sm ring-1 ring-brand-200' : 'text-ink-mute hover:text-ink'}`}
          >
            {o.icon}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
