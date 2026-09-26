import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { scoreUnscored } from '../../../lib/discovery/scan'
import { profileToData, searchConfigToData } from '../../../lib/mappers'
import { getOrCreateProfile } from '../profile/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const limit = typeof body?.limit === 'number' ? body.limit : 200
  const profile = await getOrCreateProfile()

  const config = await db.searchConfig.findFirst({ where: { profileId: profile.id } })
  if (!config) {
    return NextResponse.json({ error: 'No search config. Derive one first.' }, { status: 400 })
  }

  const scored = await scoreUnscored(
    profile.id,
    profileToData(profile),
    searchConfigToData(config),
    Math.min(limit, 200),
  )

  return NextResponse.json({ scored, message: scored === 0 ? 'No unscored jobs.' : undefined })
}
