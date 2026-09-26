export interface ExperienceEntry {
  role: string
  company: string
  location?: string
  start?: string
  end?: string
  current?: boolean
  bullets: string[]
}

export interface EducationEntry {
  degree: string
  institution: string
  year?: string
}

export interface ProfileData {
  name: string
  email?: string
  phone?: string
  location?: string
  openToRelocation: boolean
  currentRole?: string
  experienceYears: number
  summary?: string
  skills: string[]
  education: EducationEntry[]
  experience: ExperienceEntry[]
  projects: { name: string; description: string }[]
  certifications: string[]
  noticePeriod?: string
  compTargetMinLPA?: number
  compTargetMaxLPA?: number
  sectors: string[]
  dealbreakers: string[]
  targetRoles: string[]
  narrative?: string
}

export interface SearchConfigData {
  roles: string[]
  queries: string[]
  positiveKeywords: string[]
  negativeKeywords: string[]
  seniorityBoost: string[]
  locations: string[]
}

export interface GlsSignal {
  label: string
  value: number
  detail: string
}

export interface ScoreResult {
  fitScore: number
  fitReason: string
  glsScore: number
  glsSignals: GlsSignal[]
  verdict: 'apply' | 'maybe' | 'skip'
}

export interface CvBullet {
  metric?: string
  text: string
}

export interface CvSection {
  title: string
  items: { heading: string; subheading?: string; bullets: string[] }[]
}

export interface CvData {
  name: string
  title: string
  email: string
  phone: string
  location: string
  linkedin?: string
  summary: string
  skills: string[]
  sections: CvSection[]
  notes: string[]
}

export type JobSource = 'greenhouse' | 'ashby' | 'lever' | 'careers' | 'search' | 'agent'

export interface JobForScoring {
  title: string
  company: string
  location: string | null
  salary: string | null
  jdText: string | null
  postedAt: Date | null
}

export type JobForCv = JobForScoring

export interface NormalizedJob {
  source: JobSource
  sourceDetail?: string
  company: string
  title: string
  location?: string
  salary?: string
  url: string
  jdText?: string
  postedAt?: Date
}

export type JobStatus =
  | 'new'
  | 'evaluated'
  | 'applied'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'discarded'
  | 'skip'

export const JOB_STATUSES: JobStatus[] = [
  'new',
  'evaluated',
  'applied',
  'interview',
  'offer',
  'rejected',
  'discarded',
  'skip',
]

export const VERDICTS = ['apply', 'maybe', 'skip'] as const