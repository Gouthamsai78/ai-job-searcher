'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge, Score, Spinner } from '@/components/ui'
import { timeAgo } from '@/lib/utils'

interface Job {
  id: string
  title: string
  company: string
  location: string | null
  salary: string | null
  url: string
  fitScore: number | null
  glsScore: number | null
  verdict: string | null
  status: string
  postedAt: string | null
  createdAt: string
}

interface JobsResponse {
  jobs: Job[]
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [verdict, setVerdict] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('createdAt_desc')
  const [q, setQ] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanId, setScanId] = useState<string | null>(null)
  const [scanStatus, setScanStatus] = useState<string | null>(null)
  const [scoring, setScoring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadRef = useRef<() => void>(() => {})

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const params = new URLSearchParams({ verdict, status, sort })
      if (q.trim()) params.set('q', q.trim())
      try {
        const res = await fetch(`/api/jobs?${params.toString()}`)
        const json = (await res.json()) as JobsResponse
        if (cancelled) return
        setJobs(json.jobs)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadRef.current = () => void load()
    void load()

    return () => {
      cancelled = true
      loadRef.current = () => {}
    }
  }, [verdict, status, sort, q])

  const load = useCallback(() => loadRef.current(), [])

  const runScan = async () => {
    setScanning(true)
    setError(null)
    try {
      const res = await fetch('/api/discover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const json = (await res.json()) as { scanId: string }
      setScanId(json.scanId)
      setScanStatus('queued')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setScanning(false)
    }
  }

  useEffect(() => {
    if (!scanId) return
    let cancelled = false
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/discover?scanId=${scanId}`)
        const json = (await res.json()) as { scan: { status: string; error: string | null } }
        if (cancelled) return
        setScanStatus(json.scan.status)
        if (json.scan.status === 'completed' || json.scan.status === 'failed') {
          clearInterval(timer)
          setScanning(false)
          if (json.scan.error) setError(json.scan.error)
          void load()
        }
      } catch {
        clearInterval(timer)
        setScanning(false)
      }
    }, 3000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [scanId, load])

  const runScore = async () => {
    setScoring(true)
    setError(null)
    try {
      const res = await fetch('/api/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: 200 }) })
      const json = (await res.json()) as { scored: number; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Scoring failed')
      void load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setScoring(false)
    }
  }

  return (
    <div className="py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Job discovery</h1>
          <p className="mt-1 text-sm text-muted">
            Scans tracked company ATS boards, web search, and career pages — then scores each posting for fit.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void runScore()}
            disabled={scoring || scanning}
            className="rounded-md border border-edge px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-50"
          >
            {scoring ? <Spinner label="Scoring…" /> : 'Score unscored'}
          </button>
          <button
            onClick={() => void runScan()}
            disabled={scanning}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-accent-dim disabled:opacity-50"
          >
            {scanning || scanStatus ? <Spinner label={`Scan ${scanStatus ?? 'starting'}…`} /> : 'Run discovery scan'}
          </button>
        </div>
      </div>

      {error ? <p className="rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title or company…"
          className="w-56 rounded-md border border-edge bg-panel px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
        <select value={verdict} onChange={(e) => setVerdict(e.target.value)} className="rounded-md border border-edge bg-panel px-3 py-1.5 text-sm outline-none">
          <option value="all">All verdicts</option>
          <option value="apply">apply</option>
          <option value="maybe">maybe</option>
          <option value="skip">skip</option>
          <option value="unscored">unscored</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-edge bg-panel px-3 py-1.5 text-sm outline-none">
          <option value="all">All statuses</option>
          <option value="new">new</option>
          <option value="evaluated">evaluated</option>
          <option value="applied">applied</option>
          <option value="interview">interview</option>
          <option value="offer">offer</option>
          <option value="rejected">rejected</option>
          <option value="discarded">discarded</option>
          <option value="skip">skip</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-md border border-edge bg-panel px-3 py-1.5 text-sm outline-none">
          <option value="createdAt_desc">Newest first</option>
          <option value="fitScore_desc">Best fit</option>
          <option value="glsScore_desc">Best GLS</option>
          <option value="postedAt_desc">Recently posted</option>
        </select>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <Spinner label="Loading jobs…" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-edge bg-panel p-10 text-center text-sm text-muted">
          No jobs match. Run a discovery scan to start finding roles.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-edge bg-panel">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-3 font-medium">Job</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Location</th>
                <th className="px-4 py-3 text-center font-medium">Fit</th>
                <th className="px-4 py-3 text-center font-medium">GLS</th>
                <th className="px-4 py-3 font-medium">Verdict</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Status</th>
                <th className="px-4 py-3 font-medium">Found</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {jobs.map((j) => (
                <tr key={j.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <Link href={`/jobs/${j.id}`} className="block">
                      <p className="font-medium text-foreground hover:text-accent">{j.title}</p>
                      <p className="text-xs text-muted">{j.company}</p>
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">{j.location ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <Score value={j.fitScore} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Score value={j.glsScore} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={j.verdict === 'apply' ? 'emerald' : j.verdict === 'maybe' ? 'amber' : j.verdict === 'skip' ? 'red' : 'zinc'}>
                      {j.verdict ?? '—'}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <Badge tone={j.status === 'applied' || j.status === 'interview' || j.status === 'offer' ? 'blue' : 'zinc'}>{j.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{timeAgo(j.postedAt ?? j.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}