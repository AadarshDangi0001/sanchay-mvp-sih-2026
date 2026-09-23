import { Loader2 } from 'lucide-react'

export const Spinner = ({ size = 16 }: { size?: number }) => <Loader2 size={size} className="animate-spin" />

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />
}
