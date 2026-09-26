import 'server-only'
import { generateJson } from './client'
import { CV_SCHEMA } from './schemas'
import { cvPrompt, CV_SYSTEM } from './prompts'
import type { CvData, JobForCv, ProfileData } from '../types'

export async function generateTailoredCv(profile: ProfileData, job: JobForCv): Promise<CvData> {
  const cv = await generateJson<CvData>({
    system: CV_SYSTEM,
    prompt: cvPrompt(JSON.stringify(profile), job),
    schema: CV_SCHEMA,
    temperature: 0.4,
  })
  return {
    name: cv.name || profile.name || 'Candidate',
    title: cv.title || job.title,
    email: cv.email || profile.email || '',
    phone: cv.phone || profile.phone || '',
    location: cv.location || profile.location || '',
    linkedin: cv.linkedin,
    summary: cv.summary ?? '',
    skills: cv.skills ?? profile.skills ?? [],
    sections: cv.sections ?? [],
    notes: cv.notes ?? [],
  }
}