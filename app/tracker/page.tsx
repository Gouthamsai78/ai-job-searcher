'use client'

import Link from 'next/link'
import { useApi } from '@/components/ui'
import { Spinner } from '@/components/ui'
import { Score } from '@/components/ui'

interface Job {
  id: string
  title: string
  company: string
  location: string | null
  fitScore: number | null
  verdict: string | null
  status: string
}

interface TrackerData {
  counts: { status: string; _count: { _all: number } }[]
  jobs: Job[]
}

const STAGES: { key: string; tone: string }[] = [
  { key: 'new', tone: 'text-zinc-300' },
  { key: 'evaluated', tone: 'text-sky-300' },
  { key: 'applied', tone: 'text-blue-300' },
  { key: 'interview', tone: 'text-violet-300' },
  { key: 'offer', tone: 'text-emerald-300' },
  { key: 'rejected', tone: 'text-red-300' },
  { key: 'discarded', tone: 'text-zinc-400' },
  { key: 'skip', tone: 'text-zinc-400' },
]

export default function TrackerPage() {
  const { data, loading, error } = useApi<TrackerData>('/api/tracker', { poll: 15000 })

  const countFor = (status: string) => data?.counts.find((c) => c.status === status)?._count._all ?? 0
  const jobsFor = (status: string) => (data?.jobs ?? []).filter((j) => j.status === status)

  return (
    <div className="py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Application tracker</h1>
        <p className="mt-1 text-sm text-muted">
          Move jobs through your pipeline as you apply, interview, and close offers.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <Spinner label="Loading tracker…" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-300">{error}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((s) => {
            const jobs = jobsFor(s.key)
            return (
              <section key={s.key} className="rounded-xl border border-edge bg-panel p-4">
                <div className="flex items-center justify-between">
                  <h2 className={`text-sm font-semibold uppercase tracking-wider ${s.tone}`}>{s.key}</h2>
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-muted">{countFor(s.key)}</span>
                </div>
                <ul className="mt-3 space-y-2">
                  {jobs.slice(0, 8).map((j) => (
                    <li key={j.id}>
                      <Link href={`/jobs/${j.id}`} className="block rounded-lg border border-edge bg-ink p-2.5 transition-colors hover:border-accent/50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{j.title}</p>
                            <p className="truncate text-xs text-muted">
                              {j.company}
                              {j.location ? ` · ${j.location}` : ''}
                            </p>
                          </div>
                          <Score value={j.fitScore} />
                        </div>
                      </Link>
                    </li>
                  ))}
                  {jobs.length === 0 ? <li className="text-xs text-muted">Empty</li> : null}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}