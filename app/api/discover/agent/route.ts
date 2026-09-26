import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { launchAgentDiscovery, getAgentStatus } from '@/lib/firecrawl/search'
import { getOrCreateProfile } from '@/app/api/profile/route'
import { profileToData } from '@/lib/mappers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function webhookUrl(): string {
  const url = new URL('/api/webhooks/firecrawl', APP_URL)
  const secret = process.env.FIRECRAWL_WEBHOOK_SECRET
  if (secret) url.searchParams.set('token', secret)
  return url.toString()
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const profile = await getOrCreateProfile()
  const config = await db.searchConfig.findFirst({ where: { profileId: profile.id } })

  const data = profileToData(profile)
  const prompt =
    typeof body?.prompt === 'string' && body.prompt.trim()
      ? body.prompt
      : `Discover active, genuine software engineering job openings in India for a candidate with experience as ${
          data.currentRole ?? 'a software engineer'
        }, targeting ${(config?.roles ?? data.targetRoles).slice(0, 4).join(', ') || 'senior engineering roles'}. For each opening return the title, direct application URL, location, and posted date. Prefer company career pages and ATS boards (Greenhouse, Ashby, Lever). Only include openings in ${(config?.locations ?? ['Bangalore', 'Hyderabad', 'Remote']).slice(0, 4).join(', ')}. Exclude expired listings, internships, and recruitment-agency spam.`

  const launch = await launchAgentDiscovery({
    prompt,
    maxCredits: typeof body?.maxCredits === 'number' ? body.maxCredits : 60,
    webhookUrl: webhookUrl(),
  })

  const scan = await db.scan.create({
    data: {
      profileId: profile.id,
      source: 'agent',
      status: 'running',
      progress: { stage: 'agent', label: 'Firecrawl agent is searching…' },
      stats: { agentJobId: launch.jobId ?? null } as unknown as object,
    },
  })

  return NextResponse.json({ scanId: scan.id, agentJobId: launch.jobId, launch }, { status: 202 })
}

export async function GET(req: NextRequest) {
  const scanId = req.nextUrl.searchParams.get('scanId')
  if (!scanId) return NextResponse.json({ error: 'scanId required' }, { status: 400 })
  const scan = await db.scan.findUnique({ where: { id: scanId } })
  if (!scan) return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
  const stats = (scan.stats ?? {}) as { agentJobId?: string }
  if (stats.agentJobId) {
    const status = await getAgentStatus(stats.agentJobId)
    if (status.status === 'completed' || status.status === 'failed') {
      await db.scan.update({
        where: { id: scanId },
        data: {
          status: status.status,
          completedAt: new Date(),
          progress: { stage: 'agent', label: status.status },
          stats: { agentJobId: stats.agentJobId, creditsUsed: status.creditsUsed ?? null },
        },
      })
    }
    return NextResponse.json({ scan, agent: status })
  }
  return NextResponse.json({ scan })
}