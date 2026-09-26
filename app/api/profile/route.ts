import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { parseProfile, deriveSearchConfig } from '../../../lib/gemini/profile'
import { fileToText } from '../../../lib/pdf/parse'
import type { ProfileData } from '../../../lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function getOrCreateProfile() {
  let profile = await db.profile.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!profile) {
    profile = await db.profile.create({ data: { name: 'Candidate' } })
  }
  return profile
}

let profileIdMemo: string | null = null

/**
 * The profile id never changes once the row exists, so memoizing it removes a
 * whole round trip from every request that only needs the id. Each round trip
 * costs ~350ms against the remote Postgres, so this is the cheapest latency
 * win available in the API layer.
 *
 * Only use this where nothing else from the row is read — callers that touch
 * name/skills/rawCv must go through getOrCreateProfile() for fresh data.
 */
export async function getOrCreateProfileId(): Promise<string> {
  if (profileIdMemo) return profileIdMemo
  profileIdMemo = (await getOrCreateProfile()).id
  return profileIdMemo
}

/**
 * Drop the memoized id. Must be called after the profile row is deleted,
 * otherwise every subsequent request would keep querying the dead id and the
 * app would look permanently empty until the process restarted.
 */
export function clearProfileIdMemo(): void {
  profileIdMemo = null
}

export async function GET() {
  const profile = await getOrCreateProfile()
  const config = await db.searchConfig.findFirst({ where: { profileId: profile.id } })
  return NextResponse.json({ profile, config })
}

export async function POST(req: NextRequest) {
  let cvText = ''
  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    const file = form.get('file')
    const pasted = form.get('cvText')
    if (file instanceof File) cvText = await fileToText(file)
    else if (typeof pasted === 'string') cvText = pasted
  } else {
    const body = await req.json().catch(() => ({}))
    cvText = typeof body?.cvText === 'string' ? body.cvText : ''
  }

  if (!cvText.trim()) {
    return NextResponse.json({ error: 'Provide cvText or a file.' }, { status: 400 })
  }

  const data = (await parseProfile(cvText)) as ProfileData
  const profile = await getOrCreateProfile()

  const updated = await db.profile.update({
    where: { id: profile.id },
    data: {
      name: data.name || profile.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      location: data.location ?? null,
      openToRelocation: data.openToRelocation,
      currentRole: data.currentRole ?? null,
      experienceYears: data.experienceYears ?? null,
      summary: data.summary ?? null,
      rawCv: cvText,
      skills: data.skills,
      education: (data.education ?? []) as unknown as object,
      experience: (data.experience ?? []) as unknown as object,
      projects: (data.projects ?? []) as unknown as object,
      certifications: data.certifications,
      noticePeriod: data.noticePeriod ?? null,
      compTargetMinLPA: data.compTargetMinLPA ?? null,
      compTargetMaxLPA: data.compTargetMaxLPA ?? null,
      sectors: data.sectors,
      dealbreakers: data.dealbreakers,
      targetRoles: data.targetRoles,
      narrative: data.narrative ?? null,
    },
  })

  let config = await db.searchConfig.findFirst({ where: { profileId: profile.id } })
  const configData = await deriveSearchConfig(data)
  config = await db.searchConfig.upsert({
    where: { id: config?.id ?? 'missing' },
    create: { profileId: profile.id, ...configData },
    update: configData,
  })

  return NextResponse.json({ profile: updated, config })
}