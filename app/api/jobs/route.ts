import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { JOB_STATUSES, VERDICTS } from '../../../lib/types'
import { getOrCreateProfileId } from '../profile/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const profileId = await getOrCreateProfileId()
  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const verdict = searchParams.get('verdict')
  const q = searchParams.get('q')
  const sort = searchParams.get('sort') ?? 'createdAt_desc'

  const where: Record<string, unknown> = { profileId }

  if (status && status !== 'all' && JOB_STATUSES.includes(status as (typeof JOB_STATUSES)[number])) {
    where.status = status
  }
  // `unscored` is the only way to ask for rows where verdict IS NULL.
  if (verdict === 'unscored') {
    where.verdict = null
  } else if (verdict && verdict !== 'all' && VERDICTS.includes(verdict as (typeof VERDICTS)[number])) {
    where.verdict = verdict
  }
  if (q) where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { company: { contains: q, mode: 'insensitive' } }]

  const orderBy: Record<string, string> =
    sort === 'fitScore_desc'
      ? { fitScore: 'desc' }
      : sort === 'glsScore_desc'
        ? { glsScore: 'desc' }
        : sort === 'postedAt_desc'
          ? { postedAt: 'desc' }
          : { createdAt: 'desc' }

  const jobs = await db.job.findMany({ where, orderBy, take: 200 })
  return NextResponse.json({ jobs })
}