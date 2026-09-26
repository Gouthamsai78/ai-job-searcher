import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { db } from '../../../lib/db'
import { runScan } from '../../../lib/discovery/scan'
import { getOrCreateProfileId } from '../profile/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const profileId = await getOrCreateProfileId()

  const scan = await db.scan.create({
    data: { profileId, source: typeof body?.source === 'string' ? body.source : 'manual' },
  })

  after(async () => {
    try {
      await runScan(scan.id)
    } catch (err) {
      console.error('runScan failed', err)
    }
  })

  return NextResponse.json({ scanId: scan.id, status: 'queued' }, { status: 202 })
}

export async function GET(req: NextRequest) {
  const scanId = req.nextUrl.searchParams.get('scanId')
  if (scanId) {
    const scan = await db.scan.findUnique({ where: { id: scanId } })
    return NextResponse.json({ scan })
  }
  const profileId = await getOrCreateProfileId()
  const scans = await db.scan.findMany({
    where: { profileId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  return NextResponse.json({ scans })
}