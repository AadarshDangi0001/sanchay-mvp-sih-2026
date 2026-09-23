export const fmt = (n: number, d = 1): string => (Number.isFinite(n) ? n.toFixed(d) : '—')

export const signed = (n: number, d = 1): string => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(d)}`

export const pad2 = (n: number) => String(Math.floor(n)).padStart(2, '0')

export const clock = (h: number): string => `${pad2(h)}:${pad2(Math.round((h % 1) * 60))}`

export function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`
  return new Date(iso).toLocaleDateString()
}

export const uid = (p = 'id') => `${p}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`
