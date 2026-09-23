import { create } from 'zustand'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'

interface Toast { id: number; message: string; kind: 'success' | 'error' | 'info' }
interface ToastState {
  toasts: Toast[]
  push: (message: string, kind?: Toast['kind']) => void
  dismiss: (id: number) => void
}

let n = 0
export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, kind = 'success') => {
    const id = ++n
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }))
    setTimeout(() => get().dismiss(id), 3800)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = (message: string, kind: Toast['kind'] = 'success') => useToasts.getState().push(message, kind)

export function Toaster() {
  const toasts = useToasts((s) => s.toasts)
  const dismiss = useToasts((s) => s.dismiss)
  return (
    <div className="no-print pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(92vw,380px)] flex-col gap-2">
      {toasts.map((t) => {
        const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? AlertCircle : Info
        const tone = t.kind === 'success' ? 'text-emerald-600' : t.kind === 'error' ? 'text-red-600' : 'text-brand-600'
        return (
          <button
            key={t.id}
            onClick={() => dismiss(t.id)}
            className="pointer-events-auto flex animate-pop items-start gap-3 rounded-xl border border-line bg-white px-4 py-3 text-left text-sm font-semibold text-ink shadow-pop"
          >
            <Icon size={18} className={`mt-px shrink-0 ${tone}`} />
            {t.message}
          </button>
        )
      })}
    </div>
  )
}
