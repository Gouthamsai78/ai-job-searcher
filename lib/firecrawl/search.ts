import 'server-only'
import { getFirecrawl, FIRECRAWL_MAX_CREDITS } from './client'
import type { JsonFormat } from 'firecrawl'
import type { NormalizedJob } from '../types'
import { extractDomain, truncate } from '../utils'

export interface SearchResultItem {
  url: string
  title: string
  description?: string
}

export interface SearchOptions {
  limit?: number
  location?: string
}

const SERP_EXCLUDE_DOMAINS = [
  'linkedin.com',
  'indeed.com',
  'glassdoor.com',
  'glassdoor.co.in',
  'naukri.com',
  'ambitionbox.com',
  'builtin.com',
  'builtinmumbai.in',
  'foundit.in',
  'wellfound.com',
  'iitjobs.com',
  'cutshort.io',
  'hirist.com',
  'instahyre.com',
  'timesjobs.com',
  'monsterindia.com',
  'shine.com',
  'freshersworld.com',
]

export async function searchJobs(query: string, opts: SearchOptions = {}): Promise<NormalizedJob[]> {
  const { limit = 10, location = 'India' } = opts
  const res = await getFirecrawl().search(query, {
    limit,
    location,
    excludeDomains: SERP_EXCLUDE_DOMAINS,
  })
  const results: SearchResultItem[] = (res.web ?? []) as SearchResultItem[]
  return results.map((r) => ({
    source: 'search',
    company: extractDomain(r.url),
    title: r.title,
    location,
    url: r.url,
    jdText: truncate(r.description ?? '', 2000),
  }))
}

const CAREERS_LIST_SCHEMA: JsonFormat['schema'] = {
  type: 'object',
  properties: {
    jobs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          url: { type: 'string' },
          location: { type: 'string' },
          postedAt: { type: 'string' },
        },
      },
    },
  },
}

interface CareersListing {
  jobs?: { title?: string; url?: string; location?: string; postedAt?: string }[]
}

export async function scrapeCareersPage(
  company: string,
  careersUrl: string,
  opts: { detailLimit?: number } = {},
): Promise<NormalizedJob[]> {
  const doc = await getFirecrawl().scrape(careersUrl, {
    formats: [{ type: 'json', schema: CAREERS_LIST_SCHEMA }],
  })

  const parsed = doc?.json as CareersListing | undefined
  const list = parsed?.jobs ?? []
  const jobs: NormalizedJob[] = []

  for (const j of list.slice(0, opts.detailLimit ?? 10)) {
    if (!j.title || !j.url) continue
    jobs.push({
      source: 'careers',
      sourceDetail: company,
      company,
      title: j.title,
      location: j.location,
      url: j.url,
      postedAt: j.postedAt ? new Date(j.postedAt) : undefined,
    })
  }

  return jobs
}

export interface AgentDiscoveryOptions {
  prompt: string
  maxCredits?: number
  webhookUrl?: string
}

export interface AgentLaunchResult {
  jobId?: string
  status?: string
  [key: string]: unknown
}

export async function launchAgentDiscovery(opts: AgentDiscoveryOptions): Promise<AgentLaunchResult> {
  const res = await getFirecrawl().startAgent({
    prompt: opts.prompt,
    schema: CAREERS_LIST_SCHEMA,
    maxCredits: Math.min(opts.maxCredits ?? 60, FIRECRAWL_MAX_CREDITS),
    webhook: opts.webhookUrl ? { url: opts.webhookUrl } : undefined,
  })
  return (res ?? {}) as unknown as AgentLaunchResult
}

export async function getAgentStatus(jobId: string): Promise<{ status?: string; data?: unknown; creditsUsed?: number }> {
  const res = await getFirecrawl().getAgentStatus(jobId)
  return {
    status: res?.status,
    data: res?.data,
    creditsUsed: res?.creditsUsed,
  }
}
