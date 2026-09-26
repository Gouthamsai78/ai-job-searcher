import type { NormalizedJob, SearchConfigData } from './types'
import { normalizeUrl, extractDomain } from './utils'

export function passesTitleFilter(title: string, cfg: SearchConfigData): { ok: boolean; reason?: string } {
  const lower = title.toLowerCase()

  for (const neg of cfg.negativeKeywords ?? []) {
    if (neg && lower.includes(neg.toLowerCase())) {
      return { ok: false, reason: `negative keyword "${neg}"` }
    }
  }

  // Roles and positive keywords are both title signals. Unioning them can only
  // admit more jobs, never reject one that matched a role before.
  const signals = [...(cfg.roles ?? []), ...(cfg.positiveKeywords ?? [])].filter(Boolean)
  if (signals.length > 0 && !signals.some((s) => lower.includes(s.toLowerCase()))) {
    return { ok: false, reason: `no target role keyword matched` }
  }

  return { ok: true }
}

const ALWAYS_PASS_LOCATION = ['remote', 'work from home', 'wfh', 'anywhere', 'worldwide']
const VAGUE_LOCATION = ['india']

const CITY_ALIASES: Record<string, string[]> = {
  bangalore: ['bengaluru'],
  bengaluru: ['bangalore'],
  mumbai: ['bombay'],
  bombay: ['mumbai'],
  chennai: ['madras'],
  madras: ['chennai'],
  kolkata: ['calcutta'],
  calcutta: ['kolkata'],
  hyderabad: ['hyd'],
}

function expandLocation(preferred: string): string[] {
  const base = preferred.toLowerCase().trim()
  if (!base) return []
  return [base, ...(CITY_ALIASES[base] ?? [])]
}

export function passesLocationFilter(job: NormalizedJob, cfg: SearchConfigData): { ok: boolean; reason?: string } {
  const preferred = (cfg.locations ?? []).filter(Boolean)
  if (preferred.length === 0) return { ok: true }

  const stated = job.location?.trim()
  if (!stated) return { ok: true }

  const parts = stated
    .toLowerCase()
    .split(/[,/|]|\s+-\s+/)
    .map((p) => p.replace(/[()]/g, '').trim())
    .filter(Boolean)
  if (parts.length === 0) return { ok: true }

  if (parts.some((p) => ALWAYS_PASS_LOCATION.some((t) => p.includes(t)))) return { ok: true }

  const expanded = preferred.flatMap(expandLocation)
  if (parts.some((p) => expanded.some((e) => p.includes(e) || e.includes(p)))) return { ok: true }

  // "India" alone is country-level — too vague to exclude a role on.
  if (parts.every((p) => VAGUE_LOCATION.some((v) => p.includes(v)))) return { ok: true }

  return { ok: false, reason: `location "${stated}" outside preferred cities` }
}

export function filterJobs(jobs: NormalizedJob[], cfg: SearchConfigData): {
  kept: NormalizedJob[]
  rejected: { job: NormalizedJob; reason: string }[]
} {
  const kept: NormalizedJob[] = []
  const rejected: { job: NormalizedJob; reason: string }[] = []
  for (const j of jobs) {
    const title = passesTitleFilter(j.title, cfg)
    if (!title.ok) {
      rejected.push({ job: j, reason: title.reason! })
      continue
    }
    const location = passesLocationFilter(j, cfg)
    if (!location.ok) {
      rejected.push({ job: j, reason: location.reason! })
      continue
    }
    kept.push(j)
  }
  return { kept, rejected }
}

export function dedupeJobs(jobs: NormalizedJob[]): NormalizedJob[] {
  const seen = new Set<string>()
  const out: NormalizedJob[] = []
  for (const j of jobs) {
    const key = normalizeUrl(j.url)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(j)
  }
  return out
}

export function seniorityRank(jobs: NormalizedJob[], cfg: SearchConfigData): NormalizedJob[] {
  const boosts = (cfg.seniorityBoost ?? []).map((b) => b.toLowerCase())
  if (boosts.length === 0) return jobs
  const score = (j: NormalizedJob): number => {
    const lower = j.title.toLowerCase()
    return boosts.filter((b) => lower.includes(b)).length
  }
  return [...jobs].sort((a, b) => score(b) - score(a))
}

export function companyFromUrl(url: string, fallback?: string): string {
  const host = extractDomain(url)
  const name = host.split('.').slice(0, -1).join('.')
  return name || fallback || host
}
