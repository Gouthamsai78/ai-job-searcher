import 'server-only'
import { jsonFetch } from '../utils'
import type { NormalizedJob } from '../types'

export function stripHtml(html?: string | null): string {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export function parseGreenhouseDate(s?: string): Date | undefined {
  if (!s) return undefined
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? undefined : d
}

interface GreenhouseJob {
  id: number
  title: string
  location?: { name?: string }
  absolute_url?: string
  updated_at?: string
  content?: string
  salary?: { min_value?: number | null; max_value?: number | null; currency?: string | null }
  metadata?: { name?: string; value?: string }[]
}

interface GreenhouseResponse {
  jobs?: GreenhouseJob[]
  meta?: { total?: number }
}

export async function fetchGreenhouseBoard(board: string, content?: string, maxPages = 5): Promise<NormalizedJob[]> {
  const jobs: NormalizedJob[] = []
  let page = 1
  while (page <= maxPages) {
    const url = `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=${encodeURIComponent(content ?? '')}&page=${page}`
    const data = await jsonFetch<GreenhouseResponse>(url)
    const batch = data.jobs ?? []
    for (const j of batch) {
      if (!j.title || !j.absolute_url) continue
      const salary = j.salary?.min_value != null || j.salary?.max_value != null
        ? `${j.salary.currency ?? '₹'}${j.salary.min_value?.toLocaleString('en-IN') ?? ''} - ${j.salary.max_value?.toLocaleString('en-IN') ?? ''}`
        : undefined
      jobs.push({
        source: 'greenhouse',
        sourceDetail: board,
        company: board,
        title: j.title,
        location: j.location?.name,
        salary,
        url: j.absolute_url,
        jdText: stripHtml(j.content),
        postedAt: parseGreenhouseDate(j.updated_at),
      })
    }
    const total = data.meta?.total ?? 0
    if (batch.length === 0 || jobs.length >= total || batch.length < 100) break
    page += 1
  }
  return jobs
}

interface AshbyJob {
  title?: string
  location?: string
  jobUrl?: string
  publishedAt?: string
  descriptionHtml?: string
  employmentType?: string
  compensation?: { summary?: string }
  department?: string
}

interface AshbyResponse {
  jobs?: AshbyJob[]
}

export async function fetchAshbyBoard(company: string, maxPages = 3): Promise<NormalizedJob[]> {
  const jobs: NormalizedJob[] = []
  for (let i = 0; i < maxPages; i += 1) {
    const url = `https://api.ashbyhq.com/posting-api/job-board/${company}?includeCompensation=true`
    const data = await jsonFetch<AshbyResponse>(url)
    const batch = data.jobs ?? []
    for (const j of batch) {
      if (!j.title || !j.jobUrl) continue
      jobs.push({
        source: 'ashby',
        sourceDetail: company,
        company,
        title: j.title,
        location: j.location,
        salary: j.compensation?.summary,
        url: j.jobUrl,
        jdText: stripHtml(j.descriptionHtml),
        postedAt: j.publishedAt ? new Date(j.publishedAt) : undefined,
      })
    }
    if (batch.length === 0) break
  }
  return jobs
}

interface LeverJob {
  id?: string
  text?: string
  hostedUrl?: string
  createdAt?: number
  categories?: { location?: string; team?: string; commitment?: string }
  description?: string
  salaryRange?: { summary?: string }
}

export async function fetchLeverBoard(company: string): Promise<NormalizedJob[]> {
  const url = `https://api.lever.co/v0/postings/${company}?mode=json`
  const data = await jsonFetch<LeverJob[]>(url)
  const jobs: NormalizedJob[] = []
  for (const j of data ?? []) {
    if (!j.text || !j.hostedUrl) continue
    jobs.push({
      source: 'lever',
      sourceDetail: company,
      company,
      title: j.text,
      location: j.categories?.location,
      salary: j.salaryRange?.summary,
      url: j.hostedUrl,
      jdText: stripHtml(j.description),
      postedAt: j.createdAt ? new Date(j.createdAt) : undefined,
    })
  }
  return jobs
}

export async function fetchTrackedAtsBoards(
  companies: { name: string; ats?: 'greenhouse' | 'ashby' | 'lever'; atsId?: string }[],
  content?: string,
  onProgress?: (company: string, count: number) => void,
): Promise<NormalizedJob[]> {
  const results: NormalizedJob[] = []
  const tasks = companies
    .filter((c) => c.ats && c.atsId)
    .map(async (c) => {
      try {
        let batch: NormalizedJob[] = []
        if (c.ats === 'greenhouse') batch = await fetchGreenhouseBoard(c.atsId!, content, 2)
        else if (c.ats === 'ashby') batch = await fetchAshbyBoard(c.atsId!, 1)
        else if (c.ats === 'lever') batch = await fetchLeverBoard(c.atsId!)
        onProgress?.(c.name, batch.length)
        results.push(...batch)
      } catch (err) {
        console.error(`ATS fetch failed for ${c.name}`, err)
      }
    })
  await Promise.all(tasks)
  return results
}