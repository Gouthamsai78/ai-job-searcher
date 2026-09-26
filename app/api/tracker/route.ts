import 'server-only'
import { NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { getOrCreateProfileId } from '../profile/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const profileId = await getOrCreateProfileId()
  const [counts, jobs, verdictCounts] = await Promise.all([
    db.job.groupBy({ by: ['status'], where: { profileId }, _count: { _all: true } }),
    db.job.findMany({
      where: { profileId, status: { not: 'skip' } },
      orderBy: { updatedAt: 'desc' },
      take: 300,
    }),
    db.job.groupBy({
      by: ['verdict'],
      where: { profileId, verdict: { not: null } },
      _count: { _all: true },
    }),
  ])
  return NextResponse.json({ counts, verdictCounts, jobs })
}