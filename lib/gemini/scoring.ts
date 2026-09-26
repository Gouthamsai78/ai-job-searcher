import 'server-only'
import { generateJson } from './client'
import { FIT_BATCH_SCHEMA } from './schemas'
import { fitBatchPrompt, FIT_SYSTEM } from './prompts'
import { computeGls, combineVerdict } from '../scoring/gls'
import type { GlsSignal, JobForScoring, NormalizedJob, ProfileData, ScoreResult, SearchConfigData } from '../types'

interface FitResult {
  jobIndex?: number
  fitScore?: number
  fitReason?: string
  strengths?: string[]
  gaps?: string[]
  verdict?: 'apply' | 'maybe' | 'skip'
}

const CHUNK_SIZE = 12

export async function scoreJobBatch(
  profile: ProfileData,
  config: SearchConfigData,
  jobs: (NormalizedJob | JobForScoring)[],
): Promise<ScoreResult[]> {
  const results: ScoreResult[] = []
  const profileJson = JSON.stringify(profile)
  const configJson = JSON.stringify(config)

  for (let i = 0; i < jobs.length; i += CHUNK_SIZE) {
    const chunk = jobs.slice(i, i + CHUNK_SIZE)
    let parsed: { results?: FitResult[] } = {}
    try {
      parsed = await generateJson<{ results?: FitResult[] }>({
        system: FIT_SYSTEM,
        prompt: fitBatchPrompt(profileJson, configJson, chunk),
        schema: FIT_BATCH_SCHEMA,
        temperature: 0.2,
      })
    } catch (err) {
      console.error('scoreJobBatch chunk failed', err)
    }

    const byIndex = new Map<number, FitResult>()
    for (const r of parsed.results ?? []) {
      if (typeof r.jobIndex === 'number' && r.jobIndex >= 0 && r.jobIndex < chunk.length) {
        byIndex.set(r.jobIndex, r)
      }
    }

    chunk.forEach((job, idx) => {
      const fit = byIndex.get(idx) ?? {}
      const fitScore = Math.max(0, Math.min(100, Math.round(fit.fitScore ?? 50)))
      const gls = computeGls({
        source: 'source' in job ? job.source : 'search',
        url: 'url' in job ? job.url : undefined,
        postedAt: job.postedAt,
        jdText: job.jdText,
      })
      const verdict = combineVerdict(fitScore, gls.glsScore, fit.verdict ?? (fitScore >= 70 ? 'apply' : 'maybe'))

      results.push({
        fitScore,
        fitReason: fit.fitReason ?? 'No explanation provided.',
        glsScore: gls.glsScore,
        glsSignals: gls.glsSignals,
        verdict,
      })
    })
  }

  return results
}

export type { GlsSignal }