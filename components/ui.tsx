'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { readJson } from '@/lib/utils'

export function useApi<T>(path: string, opts?: { poll?: number }) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const refetchRef = useRef<() => void>(() => {})

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | undefined

    const load = async () => {
      try {
        const res = await fetch(path)
        const json = await readJson<T>(res)
        if (cancelled) return
        setData(json)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    refetchRef.current = () => void load()
    void load()
    if (opts?.poll) timer = setInterval(() => void load(), opts.poll)

    return () => {
      cancelled = true
      refetchRef.current = () => {}
      if (timer) clearInterval(timer)
    }
  }, [path, opts?.poll])

  const refetch = useCallback(() => refetchRef.current(), [])

  return { data, error, loading, refetch }
}

export function Badge({ children, tone = 'zinc' }: { children: React.ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    zinc: 'bg-white/[0.06] text-muted border-white/[0.08]',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-400/20',
    red: 'bg-red-500/10 text-red-300 border-red-400/20',
    blue: 'bg-sky-500/10 text-sky-300 border-sky-400/20',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone] ?? tones.zinc}`}
    >
      {children}
    </span>
  )
}

export function Score({ value, label }: { value: number | null | undefined; label?: string }) {
  const v = value ?? null
  if (v === null) return <span className="text-xs text-muted">—</span>
  const tone = v >= 70 ? 'text-emerald-300' : v >= 50 ? 'text-amber-300' : 'text-red-300'
  return (
    <span className={`font-mono text-sm font-semibold ${tone}`}>
      {v}
      {label ? <span className="ml-1 text-[10px] font-normal text-muted">{label}</span> : null}
    </span>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted border-t-accent" />
      {label ?? 'Working…'}
    </div>
  )
}

export function StatCard({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string
  value: string | number
  sub?: string
  tone?: 'default' | 'emerald' | 'amber' | 'red' | 'blue'
}) {
  const tones: Record<string, string> = {
    default: 'text-foreground',
    emerald: 'text-emerald-300',
    amber: 'text-amber-300',
    red: 'text-red-300',
    blue: 'text-sky-300',
  }
  return (
    <div className="rounded-xl border border-edge bg-panel p-4">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tones[tone]}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted">{sub}</p> : null}
    </div>
  )
}