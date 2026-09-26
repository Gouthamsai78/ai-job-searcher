import 'server-only'
import { generateJson } from './client'
import { PROFILE_SCHEMA, SEARCH_CONFIG_SCHEMA } from './schemas'
import { profilePrompt, searchConfigPrompt, PROFILE_SYSTEM, SEARCH_CONFIG_SYSTEM } from './prompts'
import type { ProfileData, SearchConfigData } from '../types'

export async function parseProfile(rawCv: string): Promise<ProfileData> {
  const data = await generateJson<ProfileData>({
    system: PROFILE_SYSTEM,
    prompt: profilePrompt(rawCv.slice(0, 60_000)),
    schema: PROFILE_SCHEMA,
    temperature: 0.1,
  })
  return {
    ...data,
    openToRelocation: data.openToRelocation ?? true,
    skills: data.skills ?? [],
    education: data.education ?? [],
    experience: data.experience ?? [],
    projects: data.projects ?? [],
    certifications: data.certifications ?? [],
    sectors: data.sectors ?? [],
    dealbreakers: data.dealbreakers ?? [],
    targetRoles: data.targetRoles ?? [],
  }
}

export async function deriveSearchConfig(profile: ProfileData): Promise<SearchConfigData> {
  const data = await generateJson<SearchConfigData>({
    system: SEARCH_CONFIG_SYSTEM,
    prompt: searchConfigPrompt(JSON.stringify(profile)),
    schema: SEARCH_CONFIG_SCHEMA,
    temperature: 0.3,
  })
  return {
    roles: data.roles ?? [],
    queries: data.queries ?? [],
    positiveKeywords: data.positiveKeywords ?? [],
    negativeKeywords: data.negativeKeywords ?? [],
    seniorityBoost: data.seniorityBoost ?? [],
    locations: data.locations ?? [],
  }
}