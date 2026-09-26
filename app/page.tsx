'use client'

import Link from 'next/link'
import { Badge, Score, Spinner, StatCard, useApi } from '@/components/ui'
import { LockedScreen } from '@/components/locked-screen'
import { timeAgo } from '@/lib/utils'

interface TrackerData {
  counts: { status: string; _count: { _all: number } }[]
  verdictCounts: { verdict: string | null; _count: { _all: number } }[]
  jobs: {
    id: string
    title: string
    company: string
    location: string | null
    fitScore: number | null
    glsScore: number | null
    verdict: string | null
    status: string
    createdAt: string
  }[]
}

interface ScanData {
  scanId: string
  status: string
  progress: { stage?: string; label?: string; current?: number; total?: number } | null
  stats: Record<string, unknown> | null
  error: string | null
  createdAt: string
}

type Profile = { name: string; skills: string[]; targetRoles: string[] }

export default function DashboardPage() {
  const profile = useApi<{ profile: Profile | null }>('/api/profile')

  if (profile.loading) {
    return (
      <div className="py-16">
        <Spinner label="Loading profile…" />
      </div>
    )
  }

  const active = profile.data?.profile && profile.data.profile.skills.length > 0
  if (!active) return <LockedScreen />

  return <DashboardBody name={profile.data?.profile?.name ?? 'candidate'} />
}

function DashboardBody({ name }: { name: string }) {
  const tracker = useApi<TrackerData>('/api/tracker', { poll: 15000 })
  const scans = useApi<{ scans: ScanData[] }>('/api/discover')

  const count = (status: string) =>
    tracker.data?.counts.find((c) => c.status === status)?._count._all ?? 0
  const verdict = (v: string) =>
    tracker.data?.verdictCounts.find((c) => c.verdict === v)?._count._all ?? 0

  const recent = (tracker.data?.jobs ?? []).slice(0, 5)

  return (
    <div className="py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {name}</h1>
          <p className="text-sm text-muted">
            Your scout is scanning India job boards, ATS feeds, and company career pages.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <StatCard label="Verdict: Apply" value={verdict('apply')} tone="emerald" sub="high-fit jobs" />
        <StatCard label="Maybe" value={verdict('maybe')} tone="amber" sub="borderline fit" />
        <StatCard label="Applied" value={count('applied')} tone="blue" sub="tracked in pipeline" />
        <StatCard label="Interviews" value={count('interview')} tone="blue" />
        <StatCard label="Offers" value={count('offer')} tone="emerald" />
        <StatCard label="Jobs found" value={tracker.data?.jobs.length ?? 0} sub="total discovered" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-edge bg-panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent jobs</h2>
            <Link href="/jobs" className="text-sm text-accent hover:underline">
              View all →
            </Link>
          </div>
          {tracker.loading ? (
            <div className="py-8">
              <Spinner label="Loading jobs…" />
            </div>
          ) : recent.length === 0 ? (
            <p className="py-8 text-sm text-muted">No jobs yet. Run a discovery scan.</p>
          ) : (
            <ul className="mt-3 divide-y divide-edge">
              {recent.map((j) => (
                <li key={j.id}>
                  <Link href={`/jobs/${j.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-white/[0.02]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{j.title}</p>
                      <p className="truncate text-xs text-muted">
                        {j.company}
                        {j.location ? ` · ${j.location}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Score value={j.fitScore} label="fit" />
                      <Badge tone={j.verdict === 'apply' ? 'emerald' : j.verdict === 'maybe' ? 'amber' : 'zinc'}>
                        {j.verdict ?? 'new'}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-edge bg-panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Discovery scans</h2>
            <Link href="/jobs" className="text-sm text-accent hover:underline">
              New scan →
            </Link>
          </div>
          {scans.loading ? (
            <div className="py-8">
              <Spinner label="Loading scans…" />
            </div>
          ) : (scans.data?.scans ?? []).length === 0 ? (
            <p className="py-8 text-sm text-muted">No scans run yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {(scans.data?.scans ?? []).slice(0, 6).map((s) => (
                <li key={s.scanId} className="rounded-lg border border-edge bg-ink p-3">
                  <div className="flex items-center justify-between">
                    <Badge
                      tone={s.status === 'completed' ? 'emerald' : s.status === 'running' || s.status === 'queued' ? 'amber' : 'red'}
                    >
                      {s.status}
                    </Badge>
                    <span className="text-xs text-muted">{timeAgo(s.createdAt)}</span>
                  </div>
                  {s.progress?.label ? (
                    <p className="mt-2 text-xs text-muted">{s.progress.label}</p>
                  ) : null}
                  {s.status === 'failed' && s.error ? (
                    <p className="mt-2 truncate text-xs text-red-300">{s.error}</p>
                  ) : null}
                  {s.stats && (s.stats as { added?: number }).added != null ? (
                    <p className="mt-2 text-xs text-muted">
                      {(s.stats as { added?: number }).added ?? 0} new jobs added
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
