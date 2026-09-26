import 'server-only'
import { NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { deriveSearchConfig } from '../../../lib/gemini/profile'
import { profileToData } from '../../../lib/mappers'
import { getOrCreateProfile } from '../profile/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const profile = await getOrCreateProfile()
  const config = await db.searchConfig.findFirst({ where: { profileId: profile.id } })
  return NextResponse.json({ profile, config })
}

export async function POST() {
  const profile = await getOrCreateProfile()
  if (!profile.rawCv && !profile.skills.length) {
    return NextResponse.json({ error: 'No CV parsed yet. Set up your profile first.' }, { status: 400 })
  }
  const data = await deriveSearchConfig(profileToData(profile))
  const existing = await db.searchConfig.findFirst({ where: { profileId: profile.id } })
  const config = await db.searchConfig.upsert({
    where: { id: existing?.id ?? 'missing' },
    create: { profileId: profile.id, ...data },
    update: data,
  })
  return NextResponse.json({ profile, config })
}