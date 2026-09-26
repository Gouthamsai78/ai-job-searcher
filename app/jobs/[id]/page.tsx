'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Badge, Score, Spinner } from '@/components/ui'
import { JOB_STATUSES, VERDICTS } from '@/lib/types'
import { formatDate, readJson, timeAgo } from '@/lib/utils'

interface GlsSignal {
  label: string
  value: number
  detail: string
}

interface Job {
  id: string
  title: string
  company: string
  location: string | null
  salary: string | null
  url: string
  jdText: string | null
  fitScore: number | null
  fitReason: string | null
  glsScore: number | null
  glsSignals: GlsSignal[] | null
  verdict: string | null
  status: string
  notes: string | null
  cvPdfUrl: string | null
  postedAt: string | null
  createdAt: string
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [building, setBuilding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState('')
  const [cvUrl, setCvUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/jobs/${id}`)
        const json = await readJson<{ job: Job; error?: string }>(res)
        if (!res.ok) throw new Error(json.error ?? 'Not found')
        if (cancelled) return
        setJob(json.job)
        setNotes(json.job.notes ?? '')
        setCvUrl(json.job.cvPdfUrl)
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const patch = async (data: Record<string, unknown>) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const json = await readJson<{ job: Job; error?: string }>(res)
      if (!res.ok) throw new Error(json.error ?? 'Update failed')
      setJob(json.job)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const buildCv = async () => {
    setBuilding(true)
    setError(null)
    try {
      const res = await fetch('/api/cv', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId: id }) })
      const json = await readJson<{ url: string; error?: string }>(res)
      if (!res.ok) throw new Error(json.error ?? 'CV generation failed')
      setCvUrl(json.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBuilding(false)
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Spinner label="Loading job…" />
      </div>
    )
  }

  if (error || !job) {
    return <p className="py-16 text-center text-sm text-red-300">{error ?? 'Job not found'}</p>
  }

  return (
    <div className="py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={job.verdict === 'apply' ? 'emerald' : job.verdict === 'maybe' ? 'amber' : job.verdict === 'skip' ? 'red' : 'zinc'}>
              {job.verdict ?? 'unscored'}
            </Badge>
            <Badge>{job.status}</Badge>
            <Badge tone="blue">{timeAgo(job.postedAt ?? job.createdAt)}</Badge>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{job.title}</h1>
          <p className="text-muted">
            {job.company}
            {job.location ? ` · ${job.location}` : ''}
            {job.salary ? ` · ${job.salary}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-edge px-4 py-2 text-sm text-muted hover:text-foreground"
          >
            View posting ↗
          </a>
          {cvUrl ? (
            <a href={cvUrl} target="_blank" rel="noopener noreferrer" className="rounded-md border border-accent/50 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/10">
              Download tailored CV ↗
            </a>
          ) : (
            <button onClick={() => void buildCv()} disabled={building} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-accent-dim disabled:opacity-50">
              {building ? <Spinner label="Building CV…" /> : 'Build tailored CV'}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-6">
          <div className="rounded-xl border border-edge bg-panel p-5">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <Score value={job.fitScore} />
                <p className="text-xs text-muted">fit score</p>
              </div>
              <div className="text-center">
                <Score value={job.glsScore} />
                <p className="text-xs text-muted">ghost listing score</p>
              </div>
              <div className="text-sm text-muted">
                <p>Posted: {formatDate(job.postedAt)}</p>
                <p>Added: {formatDate(job.createdAt)}</p>
              </div>
            </div>
            {job.fitReason ? (
              <p className="mt-4 rounded-lg bg-ink p-3 text-sm leading-relaxed">{job.fitReason}</p>
            ) : null}
            {!job.fitScore ? (
              <p className="mt-4 text-sm text-muted">Not scored yet. Run &quot;Score unscored&quot; on the jobs page.</p>
            ) : null}
          </div>

          {job.jdText ? (
            <div className="rounded-xl border border-edge bg-panel p-5">
              <h2 className="font-semibold">Job description</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">{job.jdText}</p>
            </div>
          ) : null}

          <div className="rounded-xl border border-edge bg-panel p-5">
            <h2 className="font-semibold">Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Recruiter contact, interview notes, follow-ups…"
              className="mt-3 w-full rounded-lg border border-edge bg-ink p-3 text-sm outline-none focus:border-accent"
            />
            <button
              onClick={() => void patch({ notes })}
              disabled={saving}
              className="mt-2 rounded-md border border-edge px-3 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save notes'}
            </button>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-xl border border-edge bg-panel p-5">
            <h2 className="font-semibold">Pipeline</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {JOB_STATUSES.filter((s) => s !== 'new').map((s) => (
                <button
                  key={s}
                  onClick={() => void patch({ status: s })}
                  className={`rounded-md border px-2.5 py-1 text-xs ${
                    job.status === s
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-edge text-muted hover:text-foreground'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-edge bg-panel p-5">
            <h2 className="font-semibold">Verdict override</h2>
            <div className="mt-3 flex gap-1.5">
              {VERDICTS.map((v) => (
                <button
                  key={v}
                  onClick={() => void patch({ verdict: v })}
                  className={`rounded-md border px-3 py-1 text-xs ${
                    job.verdict === v ? 'border-accent bg-accent/10 text-accent' : 'border-edge text-muted hover:text-foreground'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {job.glsSignals && job.glsSignals.length > 0 ? (
            <div className="rounded-xl border border-edge bg-panel p-5">
              <h2 className="font-semibold">Ghost listing signals</h2>
              <ul className="mt-3 space-y-3">
                {job.glsSignals.map((s) => (
                  <li key={s.label} className="flex items-start gap-3">
                    <Score value={s.value} />
                    <div>
                      <p className="text-sm font-medium">{s.label}</p>
                      <p className="text-xs text-muted">{s.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}