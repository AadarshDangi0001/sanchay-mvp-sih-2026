import type { ReactNode } from 'react'
import { GLOSSARY } from '../../data/glossary'

/** Inline engineering term with a hover / focus explanation. */
export function Term({ k, children }: { k: keyof typeof GLOSSARY | string; children?: ReactNode }) {
  const entry = GLOSSARY[k]
  if (!entry) return <>{children}</>
  return (
    <span className="group/term relative inline-block">
      <span
        tabIndex={0}
        className="cursor-help border-b border-dotted border-brand-400/70 outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        {children ?? entry.term}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-2 w-60 -translate-x-1/2 translate-y-1 rounded-xl bg-ink px-3 py-2.5 text-left text-xs font-medium normal-case leading-relaxed tracking-normal text-white opacity-0 shadow-pop transition duration-150 group-hover/term:visible group-hover/term:translate-y-0 group-hover/term:opacity-100 group-focus-within/term:visible group-focus-within/term:translate-y-0 group-focus-within/term:opacity-100"
      >
        <span className="mb-0.5 block font-mono text-[10px] uppercase tracking-widest text-aqua-300">{entry.term}</span>
        {entry.text}
      </span>
    </span>
  )
}
