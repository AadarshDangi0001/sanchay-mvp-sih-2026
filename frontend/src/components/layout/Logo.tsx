export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden>
      <rect width="34" height="34" rx="9" fill="#1d55d6" />
      <path d="M6.5 25.5 17 8l10.5 17.5z" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M12 25.5v-5.5h10v5.5" fill="none" stroke="#67e8f9" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="27" cy="8" r="2.6" fill="#67e8f9" />
    </svg>
  )
}
