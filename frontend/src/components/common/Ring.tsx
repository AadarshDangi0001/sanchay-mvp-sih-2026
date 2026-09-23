export function Ring({
  value, size = 84, stroke = 8, label, color = 'var(--color-brand-600)',
}: { value: number; size?: number; stroke?: number; label?: string; color?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e6ecf5" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(.2,.7,.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="num text-lg font-bold leading-none">{Math.round(v)}<span className="text-[10px] font-semibold text-ink-mute">%</span></div>
          {label && <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink-mute">{label}</div>}
        </div>
      </div>
    </div>
  )
}
