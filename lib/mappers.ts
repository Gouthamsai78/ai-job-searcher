import 'server-only'
import type { Prisma } from '../generated/client'
import type { ProfileData, SearchConfigData } from './types'

type ProfileRow = Prisma.ProfileGetPayload<null>

export function profileToData(p: ProfileRow): ProfileData {
  return {
    name: p.name,
    email: p.email ?? undefined,
    phone: p.phone ?? undefined,
    location: p.location ?? undefined,
    openToRelocation: p.openToRelocation,
    currentRole: p.currentRole ?? undefined,
    experienceYears: p.experienceYears ?? 0,
    summary: p.summary ?? undefined,
    skills: p.skills ?? [],
    education: (p.education as unknown as ProfileData['education']) ?? [],
    experience: (p.experience as unknown as ProfileData['experience']) ?? [],
    projects: (p.projects as unknown as ProfileData['projects']) ?? [],
    certifications: p.certifications ?? [],
    noticePeriod: p.noticePeriod ?? undefined,
    compTargetMinLPA: p.compTargetMinLPA ?? undefined,
    compTargetMaxLPA: p.compTargetMaxLPA ?? undefined,
    sectors: p.sectors ?? [],
    dealbreakers: p.dealbreakers ?? [],
    targetRoles: p.targetRoles ?? [],
    narrative: p.narrative ?? undefined,
  }
}

type SearchConfigRow = Prisma.SearchConfigGetPayload<null>
export function searchConfigToData(c: SearchConfigRow): SearchConfigData {
  return {
    roles: c.roles ?? [],
    queries: c.queries ?? [],
    positiveKeywords: c.positiveKeywords ?? [],
    negativeKeywords: c.negativeKeywords ?? [],
    seniorityBoost: c.seniorityBoost ?? [],
    locations: c.locations ?? [],
  }
}