'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Badge, Spinner } from '@/components/ui'
import { timeAgo } from '@/lib/utils'

interface AgentStatus {
  status?: string
  creditsUsed?: number
  data?: unknown
}

interface ScanRow {
  scanId: string
  status: string
  progress: { stage?: string; label?: string } | null
  createdAt: string
}

export default function AgentPage() {
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState<{ scanId: string; agentStatus: AgentStatus | null } | null>(null)
  const [history, setHistory] = useState<ScanRow[]>([])

  const launch = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/discover/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() ? prompt : undefined }),
      })
      const json = (await res.json()) as { scanId: string; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Launch failed')
      setActive({ scanId: json.scanId, agentStatus: null })
      setPrompt('')
      void poll(json.scanId)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const poll = async (scanId: string) => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/discover/agent?scanId=${scanId}`)
        const json = (await res.json()) as { agent?: AgentStatus; scan?: { status: string } }
        setActive({ scanId, agentStatus: json.agent ?? null })
        if (json.agent?.status === 'completed' || json.agent?.status === 'failed' || json.scan?.status === 'completed' || json.scan?.status === 'failed') {
          clearInterval(timer)
        }
      } catch {
        clearInterval(timer)
      }
    }, 4000)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/discover')
        const json = (await res.json()) as { scans: ScanRow[] }
        if (!cancelled) setHistory(json.scans.filter((s) => s.progress?.stage === 'agent'))
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Firecrawl agent</h1>
        <p className="mt-1 text-sm text-muted">
          Deep discovery runs asynchronously on Firecrawl and posts results back to the webhook. Each run costs Firecrawl
          credits.
        </p>
      </div>

      <section className="rounded-xl border border-edge bg-panel p-5">
        <h2 className="font-semibold">Launch a discovery agent</h2>
        <p className="mt-1 text-xs text-muted">
          Leave blank to use the auto-generated prompt from your profile and search config.
        </p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="Custom instructions, e.g. 'Find Staff-level backend roles at Indian fintech startups hiring in Bangalore…'"
          className="mt-3 w-full rounded-lg border border-edge bg-ink p-3 text-sm outline-none focus:border-accent"
        />
        <button
          onClick={() => void launch()}
          disabled={busy}
          className="mt-3 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-accent-dim disabled:opacity-50"
        >
          {busy ? <Spinner label="Launching…" /> : 'Launch agent'}
        </button>
      </section>

      {error ? <p className="rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}

      {active ? (
        <section className="rounded-xl border border-edge bg-panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Agent run</h2>
            <Badge tone={active.agentStatus?.status === 'completed' ? 'emerald' : active.agentStatus?.status === 'failed' ? 'red' : 'amber'}>
              {active.agentStatus?.status ?? 'processing'}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted">
            {active.agentStatus?.creditsUsed != null ? `Credits used: ${active.agentStatus.creditsUsed}` : 'Running…'}
          </p>
          <p className="mt-2 text-sm text-muted">
            Results arrive via webhook and appear in{' '}
            <Link href="/jobs" className="text-accent hover:underline">
              Jobs
            </Link>
            .
          </p>
        </section>
      ) : null}

      {history.length > 0 ? (
        <section className="rounded-xl border border-edge bg-panel p-5">
          <h2 className="font-semibold">Recent agent runs</h2>
          <ul className="mt-3 divide-y divide-edge">
            {history.slice(0, 5).map((s) => (
              <li key={s.scanId} className="flex items-center justify-between py-2.5">
                <div>
                  <Badge tone={s.status === 'completed' ? 'emerald' : s.status === 'failed' ? 'red' : 'amber'}>{s.status}</Badge>
                </div>
                <span className="text-xs text-muted">{timeAgo(s.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}