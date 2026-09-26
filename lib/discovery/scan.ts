import 'server-only'
import { db } from '../db'
import type { Prisma } from '../../generated/client'
import { fetchTrackedAtsBoards } from '../firecrawl/ats'
import { searchJobs, scrapeCareersPage } from '../firecrawl/search'
import { filterJobs, dedupeJobs, seniorityRank } from '../jobs'
import { scoreJobBatch } from '../gemini/scoring'
import { profileToData, searchConfigToData } from '../mappers'
import { TRACKED_COMPANIES } from '../portals'
import type { NormalizedJob } from '../types'
import { truncate } from '../utils'

export interface ScanStats {
  ats: number
  search: number
  careers: number
  afterFilter: number
  afterDedup: number
  added: number
  seen: number
  scored: number
  rejected: { reason: string; count: number }[]
}

function tallyRejected(rejected: { job: NormalizedJob; reason: string }[]): ScanStats['rejected'] {
  const map = new Map<string, number>()
  for (const r of rejected) map.set(r.reason, (map.get(r.reason) ?? 0) + 1)
  return [...map.entries()].map(([reason, count]) => ({ reason, count }))
}

async function setProgress(scanId: string, progress: Record<string, unknown>) {
  await db.scan
    .update({ where: { id: scanId }, data: { progress: progress as Prisma.InputJsonValue } })
    .catch(() => undefined)
}

export async function runScan(scanId: string): Promise<ScanStats | undefined> {
  const scan = await db.scan.findUnique({ where: { id: scanId }, include: { profile: true } })
  if (!scan?.profile) return undefined

  const profile = scan.profile
  const cfgRow = await db.searchConfig.findFirst({ where: { profileId: profile.id } })
  if (!cfgRow) {
    await db.scan.update({ where: { id: scanId }, data: { status: 'failed', error: 'No search config for profile' } })
    return undefined
  }

  const cfg = searchConfigToData(cfgRow)
  const profileData = profileToData(profile)

  await db.scan.update({ where: { id: scanId }, data: { status: 'running', startedAt: new Date(), progress: { stage: 'ats' } } })

  const atsCompanies = TRACKED_COMPANIES.filter((c) => c.ats && c.atsId)
  const careersCompanies = TRACKED_COMPANIES.filter((c) => c.careersUrl)

  try {
    // Stage A: tracked ATS boards (free, direct API)
    await setProgress(scanId, { stage: 'ats', label: 'Scanning tracked company ATS boards' })
    const atsJobs = await fetchTrackedAtsBoards(atsCompanies, undefined, () => undefined)
    let stats: ScanStats = { ...emptyStats(), ats: atsJobs.length }

    // Stage B: Firecrawl web searches for each query
    const searchJobsAll: NormalizedJob[] = []
    await setProgress(scanId, { stage: 'search', label: 'Running web searches', current: 0, total: cfg.queries.length })
    for (let i = 0; i < cfg.queries.length; i += 1) {
      const q = cfg.queries[i]
      try {
        const hits = await searchJobs(q, { limit: 8, location: cfg.locations[0] ?? 'India' })
        searchJobsAll.push(...hits)
      } catch (err) {
        console.error(`Search failed for "${q}"`, err)
      }
      await setProgress(scanId, { stage: 'search', label: 'Running web searches', current: i + 1, total: cfg.queries.length })
    }
    stats = { ...stats, search: searchJobsAll.length }

    // Stage C: company careers pages
    const careersJobs: NormalizedJob[] = []
    await setProgress(scanId, { stage: 'careers', label: 'Scraping company careers pages', current: 0, total: careersCompanies.length })
    for (let i = 0; i < careersCompanies.length; i += 1) {
      const c = careersCompanies[i]
      try {
        const scraped = await scrapeCareersPage(c.name, c.careersUrl!, { detailLimit: 6 })
        careersJobs.push(...scraped)
      } catch (err) {
        console.error(`Careers scrape failed for ${c.name}`, err)
      }
      await setProgress(scanId, { stage: 'careers', label: 'Scraping company careers pages', current: i + 1, total: careersCompanies.length })
    }
    stats = { ...stats, careers: careersJobs.length }

    // Normalize → filter → dedupe → rank
    await setProgress(scanId, { stage: 'filter', label: 'Filtering and deduping' })
    const combined = [...atsJobs, ...searchJobsAll, ...careersJobs]
    const { kept, rejected } = filterJobs(combined, cfg)
    const deduped = dedupeJobs(kept)
    const ranked = seniorityRank(deduped, cfg)
    stats = {
      ...stats,
      afterFilter: kept.length,
      afterDedup: deduped.length,
      rejected: tallyRejected(rejected),
    }

    // Upsert jobs
    await setProgress(scanId, { stage: 'upsert', label: 'Saving jobs' })
    const urls = ranked.map((j) => j.url)
    const existing = urls.length
      ? await db.job.findMany({ where: { url: { in: urls } }, select: { url: true } })
      : []
    const known = new Set(existing.map((e) => e.url))
    const fresh = ranked.filter((j) => !known.has(j.url))

    if (fresh.length > 0) {
      await db.job.createMany({
        data: fresh.map((j) => ({
          profileId: profile.id,
          scanId,
          source: j.source,
          sourceDetail: j.sourceDetail,
          company: j.company,
          title: j.title,
          location: j.location,
          salary: j.salary,
          url: j.url,
          jdText: j.jdText,
          postedAt: j.postedAt,
        })),
        skipDuplicates: true,
      })
    }

    if (ranked.length > 0) {
      await db.scanHistory
        .createMany({
          data: ranked.map((j) => ({
            url: j.url,
            source: j.source,
            title: j.title,
            company: j.company,
            status: known.has(j.url) ? 'seen' : 'added',
          })),
          skipDuplicates: true,
        })
        .catch(() => undefined)
    }

    const added = fresh.length
    const seen = ranked.length - added
    stats = { ...stats, added, seen }

    await setProgress(scanId, { stage: 'score', label: 'Truncating job descriptions' })
    await truncateJobTexts(scanId)

    await setProgress(scanId, { stage: 'score', label: 'Scoring new jobs' })
    try {
      const scored = await scoreUnscored(profile.id, profileData, cfg)
      stats = { ...stats, scored }
    } catch (err) {
      console.error('Scoring failed (jobs still saved)', err)
      stats = { ...stats, scored: 0 }
    }

    await db.scan.update({
      where: { id: scanId },
      data: { status: 'completed', completedAt: new Date(), stats: stats as unknown as Prisma.JsonObject, progress: { stage: 'done' } },
    })
    return stats
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await db.scan.update({ where: { id: scanId }, data: { status: 'failed', error: message, completedAt: new Date() } })
    throw err
  }
}

function emptyStats(): ScanStats {
  return { ats: 0, search: 0, careers: 0, afterFilter: 0, afterDedup: 0, added: 0, seen: 0, scored: 0, rejected: [] }
}

async function truncateJobTexts(scanId: string) {
  const jobs = await db.job.findMany({
    where: { scanId, jdText: { not: null } },
    select: { id: true, jdText: true },
  })
  const oversized = jobs.filter((j) => j.jdText && j.jdText.length > 2000)
  if (oversized.length === 0) return
  await Promise.all(
    oversized.map((j) =>
      db.job.update({
        where: { id: j.id },
        data: { jdText: truncate(j.jdText!, 2000) },
      }),
    ),
  )
}

export async function scoreUnscored(
  profileId: string,
  profileData: Parameters<typeof scoreJobBatch>[0],
  cfg: ReturnType<typeof searchConfigToData>,
  limit = 200,
): Promise<number> {
  const unscored = await db.job.findMany({
    where: { profileId, fitScore: null },
    select: { id: true, title: true, company: true, location: true, salary: true, jdText: true, postedAt: true },
    take: limit,
  })
  if (unscored.length === 0) return 0

  const jobPicks = unscored.map((j) => ({
    title: j.title,
    company: j.company,
    location: j.location,
    salary: j.salary,
    jdText: j.jdText,
    postedAt: j.postedAt,
  }))

  const results = await scoreJobBatch(profileData, cfg, jobPicks)

  // Sequential per-row updates cost a full round trip each (~350ms), so a full
  // 200-job batch used to spend ~70s doing nothing but waiting on the wire.
  await Promise.all(
    unscored.map((job, i) => {
      const r = results[i]
      if (!r) return Promise.resolve()
      return db.job.update({
        where: { id: job.id },
        data: {
          fitScore: r.fitScore,
          fitReason: r.fitReason,
          glsScore: r.glsScore,
          glsSignals: r.glsSignals as unknown as Prisma.InputJsonValue,
          verdict: r.verdict,
          status: 'evaluated',
        },
      })
    }),
  )
  return unscored.length
}
