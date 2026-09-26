import 'server-only'
import type { GlsSignal, JobSource } from '../types'

export function sourceQualityScore(source: JobSource, url?: string): { value: number; detail: string } {
  switch (source) {
    case 'greenhouse':
      return { value: 95, detail: 'Greenhouse board — structured, near-real-time' }
    case 'ashby':
      return { value: 95, detail: 'Ashby board — structured, near-real-time' }
    case 'lever':
      return { value: 95, detail: 'Lever board — structured, near-real-time' }
    case 'careers':
      return { value: 88, detail: 'Company careers page scrape' }
    case 'agent':
      return { value: 80, detail: 'Firecrawl agent discovery' }
    case 'search':
      return url?.includes('linkedin.com')
        ? { value: 55, detail: 'LinkedIn — heavy ghost/outdated listings, rate-limited' }
        : url?.includes('naukri.com')
          ? { value: 62, detail: 'Naukri — recruiter-driven, some stale postings' }
          : url?.includes('foundit.in')
            ? { value: 58, detail: 'Foundit (Monster) — many stale listings' }
            : url?.includes('iimjobs.com')
              ? { value: 65, detail: 'iimjobs — senior roles, moderate freshness' }
              : { value: 72, detail: 'General web search result' }
  }
}

export function freshnessScore(postedAt?: Date | null): { value: number; detail: string } {
  if (!postedAt) return { value: 55, detail: 'No posted date — assume older than 30d' }
  const ageDays = (Date.now() - postedAt.getTime()) / 86_400_000
  if (ageDays <= 7) return { value: 100, detail: `Posted ${Math.round(ageDays)}d ago — fresh` }
  if (ageDays <= 14) return { value: 88, detail: `Posted ${Math.round(ageDays)}d ago — recent` }
  if (ageDays <= 30) return { value: 72, detail: `Posted ${Math.round(ageDays)}d ago — moderately fresh` }
  if (ageDays <= 90) return { value: 45, detail: `Posted ${Math.round(ageDays)}d ago — possibly stale` }
  return { value: 20, detail: `Posted ${Math.round(ageDays)}d ago — likely stale` }
}

const REPOST_MARKERS = [
  'reposted',
  'reposting',
  'urgent hiring',
  'urgent requirement',
  'immediate joining',
  'multiple positions',
  'multiple openings',
  'freshers welcome',
  'experience not required',
  'walk-in',
  'direct walkin',
]

export function repostSignal(jdText?: string | null): { value: number; detail: string; found: string[] } {
  if (!jdText) return { value: 70, detail: 'No description to inspect', found: [] }
  const lower = jdText.toLowerCase()
  const found = REPOST_MARKERS.filter((m) => lower.includes(m))
  if (found.length === 0) return { value: 100, detail: 'No repost/urgent markers in description', found }
  const score = Math.max(30, 100 - found.length * 22)
  return { value: score, detail: `Repost/urgent markers found: ${found.join(', ')}`, found }
}

export function computeGls(job: {
  source?: JobSource
  url?: string
  postedAt?: Date | null
  jdText?: string | null
}): {
  glsScore: number
  glsSignals: GlsSignal[]
} {
  const source = sourceQualityScore(job.source ?? 'search', job.url)
  const freshness = freshnessScore(job.postedAt)
  const repost = repostSignal(job.jdText)

  const signals: GlsSignal[] = [
    { label: 'Source quality', value: source.value, detail: source.detail },
    { label: 'Listing freshness', value: freshness.value, detail: freshness.detail },
    { label: 'Repost/urgency scan', value: repost.value, detail: repost.detail },
  ]

  const glsScore = Math.round(source.value * 0.45 + freshness.value * 0.35 + repost.value * 0.2)
  return { glsScore, glsSignals: signals }
}

export function combineVerdict(fitScore: number, glsScore: number, modelVerdict: 'apply' | 'maybe' | 'skip'): 'apply' | 'maybe' | 'skip' {
  if (fitScore < 50 || glsScore < 40) return 'skip'
  let v: 'apply' | 'maybe' | 'skip' = modelVerdict
  if (glsScore < 55 && v === 'apply') v = 'maybe'
  if (glsScore < 45 && v === 'maybe') v = 'skip'
  return v
}