import 'server-only'
import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { companyFromUrl } from '@/lib/jobs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface AgentJobItem {
  title?: string
  url?: string
  location?: string
  postedAt?: string
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

export async function POST(req: NextRequest) {
  const secret = process.env.FIRECRAWL_WEBHOOK_SECRET

  if (secret) {
    const token = req.nextUrl.searchParams.get('token') ?? ''
    if (!safeEqual(token, secret)) {
      return NextResponse.json({ error: 'Invalid webhook token' }, { status: 401 })
    }
  }

  const payload = await req.json().catch(() => ({}))
  const agentJobId = typeof payload?.id === 'string' ? payload.id : ''
  if (!agentJobId) {
    return NextResponse.json({ error: 'Missing agent job id' }, { status: 400 })
  }

  // Only accept callbacks for a run we actually launched. Without a shared
  // secret configured this is the sole gate, so it must come first-class.
  const scan = await db.scan.findFirst({ where: { stats: { path: ['agentJobId'], equals: agentJobId } } })
  if (!scan) {
    return NextResponse.json({ error: 'Unknown agent run' }, { status: 404 })
  }

  const data = payload?.data as { jobs?: AgentJobItem[] } | undefined
  const jobs = Array.isArray(data?.jobs) ? data.jobs : []

  await db.scan.update({
    where: { id: scan.id },
    data: { status: 'completed', completedAt: new Date(), progress: { stage: 'agent', label: 'completed' } },
  })

  if (jobs.length === 0) {
    return NextResponse.json({ ok: true, received: 0 })
  }

  let added = 0
  let seen = 0

  // Two round trips per job made this the slowest path in the app (each one
  // costs ~350ms against a remote Postgres). Batch it: one lookup, one insert.
  const candidates = new Map<string, AgentJobItem & { url: string; title: string }>()
  for (const j of jobs) {
    if (!j.url || !j.title) continue
    const item: AgentJobItem & { url: string; title: string } = { ...j, url: j.url, title: j.title }
    if (!candidates.has(item.url)) candidates.set(item.url, item)
  }

  const urls = [...candidates.keys()]
  if (urls.length > 0) {
    const existing = await db.job.findMany({ where: { url: { in: urls } }, select: { url: true } })
    const known = new Set(existing.map((e) => e.url))

    const toCreate = urls
      .filter((url) => !known.has(url))
      .map((url) => {
        const j = candidates.get(url)!
        return {
          profileId: scan.profileId,
          source: 'agent',
          company: companyFromUrl(j.url, 'Unknown Company'),
          title: j.title,
          location: j.location ?? null,
          url: j.url,
          postedAt: j.postedAt ? new Date(j.postedAt) : null,
        }
      })

    if (toCreate.length > 0) {
      const res = await db.job.createMany({ data: toCreate, skipDuplicates: true })
      added = res.count
    }
    seen = urls.length - added
  }

  return NextResponse.json({ ok: true, added, seen })
}
